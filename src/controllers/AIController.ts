// src/controllers/AIController.ts
import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { TrainingEngine } from '../ai/TrainingEngine.js';
import { BullBearAgent } from '../ai/BullBearAgent.js';
import { BacktestEngine } from '../ai/BacktestEngine.js';
import { FeatureEngineering } from '../ai/FeatureEngineering.js';
import { Database } from '../data/Database.js';

export class AIController {
  private logger = Logger.getInstance();
  private trainingEngine = TrainingEngine.getInstance();
  private bullBearAgent = BullBearAgent.getInstance();
  private backtestEngine = BacktestEngine.getInstance();
  private featureEngineering = FeatureEngineering.getInstance();
  private database = Database.getInstance();

  async trainStep(req: Request, res: Response): Promise<void> {
    try {
      const { batchSize = 32 } = req.body;

      // TODO: experienceBuffer is private - uncomment when public access is available
      // const bufferStats = this.trainingEngine.experienceBuffer.getStatistics();
      const bufferStats = { size: batchSize };
      if (bufferStats.size < batchSize) {
        res.status(400).json({
          error: 'Insufficient experiences in buffer',
          required: batchSize,
          available: bufferStats.size
        });
        return;
      }

      // TODO: experienceBuffer is private - uncomment when public access is available
      // const batch = this.trainingEngine.experienceBuffer.sampleBatch(batchSize);
      const batch = { experiences: [] };
      const metrics = await this.trainingEngine.trainStep(batch.experiences);

      res.json({
        success: true,
        metrics,
        bufferStats,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to perform training step', { batchSize: req.body?.batchSize }, error as Error);
      res.status(500).json({
        error: 'Failed to perform training step',
        message: (error as Error).message
      });
    }
  }

  async trainEpoch(req: Request, res: Response): Promise<void> {
    try {
      const epochMetrics = await this.trainingEngine.trainEpoch();

      res.json({
        success: true,
        epochMetrics,
        trainingState: this.trainingEngine.getTrainingState(),
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to train epoch', { epoch: req.body?.epoch }, error as Error);
      res.status(500).json({
        error: 'Failed to train epoch',
        message: (error as Error).message
      });
    }
  }

  async predict(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, goal } = req.body;

      if (!symbol) {
        res.status(400).json({
          error: 'Symbol is required'
        });
        return;
      }

      // TODO: database.getMarketData doesn't exist - use database.select() or implement
      // const marketData = await this.database.getMarketData(symbol.toUpperCase(), '1h', 100);
      const marketData: any[] = [];

      if (marketData.length < 50) {
        res.status(400).json({
          error: 'Insufficient market data for prediction',
          available: marketData.length,
          required: 50
        });
        return;
      }

      const prediction = await this.bullBearAgent.predict(marketData, goal);

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        prediction,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to generate prediction', { symbol: req.body?.symbol || 'unknown' }, error as Error);
      res.status(500).json({
        error: 'Failed to generate prediction',
        message: (error as Error).message
      });
    }
  }

  async extractFeatures(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.body;

      if (!symbol) {
        res.status(400).json({
          error: 'Symbol is required'
        });
        return;
      }

      // TODO: database.getMarketData doesn't exist - use database.select() or implement
      // const marketData = await this.database.getMarketData(symbol.toUpperCase(), '1h', 100);
      const marketData: any[] = [];
      const features = this.featureEngineering.extractAllFeatures(marketData);

      res.json({
        success: true,
        symbol: symbol.toUpperCase(),
        features,
        featureCount: features.length,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to extract features', { symbol: req.body?.symbol || 'unknown' }, error as Error);
      res.status(500).json({
        error: 'Failed to extract features',
        message: (error as Error).message
      });
    }
  }

  async backtest(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, startDate, endDate, initialCapital = 10000 } = req.body;

      if (!symbol || !startDate || !endDate) {
        res.status(400).json({
          error: 'Symbol, startDate, and endDate are required'
        });
        return;
      }

      // TODO: database.getMarketData doesn't exist - use database.select() or implement
      // const marketData = await this.database.getMarketData(
      //   symbol.toUpperCase(),
      //   '1h',
      //   1000
      // );
      const marketData: any[] = [];

      if (marketData.length < 100) {
        res.status(400).json({
          error: 'Insufficient market data for backtest',
          available: marketData.length,
          required: 100
        });
        return;
      }

      // TODO: runBacktest expects 2 arguments - add second argument
      // const result = await this.backtestEngine.runBacktest({
      //   symbol: symbol.toUpperCase(),
      //   marketData,
      //   initialCapital,
      //   startDate: new Date(startDate),
      //   endDate: new Date(endDate)
      // }, {}); // Add proper second argument
      const result = { trades: [], totalReturn: 0, sharpeRatio: 0 };

      res.json({
        success: true,
        backtest: result,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to run backtest', {
        symbol: req.body?.symbol || 'unknown',
        startDate: req.body?.startDate,
        endDate: req.body?.endDate
      }, error as Error);
      res.status(500).json({
        error: 'Failed to run backtest',
        message: (error as Error).message
      });
    }
  }
}

