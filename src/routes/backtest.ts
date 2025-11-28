/**
 * Backtest Routes
 * Comprehensive backtesting endpoints for trading strategies
 */
import express from 'express';
import { Logger } from '../core/Logger.js';
import { BacktestEngine } from '../ai/BacktestEngine.js';
import { RealBacktestEngine } from '../services/RealBacktestEngine.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const logger = Logger.getInstance();
const backtestEngine = BacktestEngine.getInstance();
const realBacktestEngine = RealBacktestEngine.getInstance();

const BACKTEST_RESULTS_DIR = path.join(process.cwd(), 'data', 'backtest-results');

// Ensure results directory exists
async function ensureResultsDir() {
  try {
    await fs.mkdir(BACKTEST_RESULTS_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create backtest results directory', {}, error as Error);
  }
}

ensureResultsDir();

/**
 * POST /api/backtest/run
 * Execute a comprehensive backtest
 * Body: {
 *   symbol: string,
 *   strategy: string | object,
 *   startDate: string,
 *   endDate: string,
 *   initialCapital?: number,
 *   commission?: number,
 *   slippage?: number,
 *   timeframe?: string
 * }
 */
router.post('/run', async (req, res) => {
  try {
    const {
      symbol,
      strategy,
      startDate,
      endDate,
      initialCapital = 10000,
      commission = 0.001,
      slippage = 0.0005,
      timeframe = '1h'
    } = req.body;
    
    if (!symbol || !strategy || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'symbol, strategy, startDate, and endDate are required'
      });
    }
    
    logger.info('Starting backtest', { symbol, startDate, endDate, timeframe });
    
    // Execute backtest using RealBacktestEngine
    const result = await realBacktestEngine.runBacktest(
      symbol,
      timeframe,
      500, // Default number of bars
      {
        startDate: new Date(startDate).getTime(),
        endDate: new Date(endDate).getTime(),
        initialCapital: Number(initialCapital),
        feeRate: Number(commission),
        slippageRate: Number(slippage),
        maxPositionSize: 0.95
      }
    );
    
    // Generate unique ID for this backtest
    const backtestId = `backtest_${Date.now()}_${symbol}`;
    
    // Save results
    const backtestResult = {
      id: backtestId,
      symbol,
      strategy: typeof strategy === 'string' ? strategy : 'custom',
      startDate,
      endDate,
      timeframe,
      initialCapital,
      commission,
      slippage,
      result,
      createdAt: new Date().toISOString()
    };
    
    const resultPath = path.join(BACKTEST_RESULTS_DIR, `${backtestId}.json`);
    await fs.writeFile(resultPath, JSON.stringify(backtestResult, null, 2));
    
    res.json({
      success: true,
      data: backtestResult,
      message: 'Backtest completed successfully'
    });
    
  } catch (error) {
    logger.error('Backtest execution failed', {}, error as Error);
    res.status(500).json({
      error: 'Backtest failed',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/backtest/results/:id
 * Get backtest results by ID
 */
router.get('/results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resultPath = path.join(BACKTEST_RESULTS_DIR, `${id}.json`);
    
    try {
      const content = await fs.readFile(resultPath, 'utf-8');
      const result = JSON.parse(content);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(404).json({
        error: 'Backtest not found',
        message: `Backtest with id '${id}' does not exist`
      });
    }
  } catch (error) {
    logger.error('Failed to get backtest result', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get backtest result',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/backtest/history
 * List all past backtests
 */
router.get('/history', async (req, res) => {
  try {
    const { limit = 50, offset = 0, symbol } = req.query;
    
    const files = await fs.readdir(BACKTEST_RESULTS_DIR);
    let backtests = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (file) => {
          try {
            const content = await fs.readFile(path.join(BACKTEST_RESULTS_DIR, file), 'utf-8');
            return JSON.parse(content);
          } catch (error) {
            logger.error(`Failed to read backtest ${file}`, {}, error as Error);
            return null;
          }
        })
    );
    
    // Filter by symbol if provided
    if (symbol) {
      backtests = backtests.filter(b => b && b.symbol === symbol);
    }
    
    // Remove nulls and sort by date
    backtests = backtests
      .filter(b => b !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Apply pagination
    const total = backtests.length;
    const paginatedResults = backtests.slice(Number(offset), Number(offset) + Number(limit));
    
    res.json({
      success: true,
      data: paginatedResults,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });
    
  } catch (error) {
    logger.error('Failed to list backtest history', {}, error as Error);
    res.status(500).json({
      error: 'Failed to list history',
      message: (error as Error).message
    });
  }
});

/**
 * DELETE /api/backtest/results/:id
 * Delete a backtest result
 */
router.delete('/results/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resultPath = path.join(BACKTEST_RESULTS_DIR, `${id}.json`);
    
    try {
      await fs.unlink(resultPath);
      
      res.json({
        success: true,
        message: 'Backtest result deleted successfully'
      });
    } catch (error) {
      res.status(404).json({
        error: 'Backtest not found',
        message: `Backtest with id '${id}' does not exist`
      });
    }
  } catch (error) {
    logger.error('Failed to delete backtest result', {}, error as Error);
    res.status(500).json({
      error: 'Failed to delete backtest',
      message: (error as Error).message
    });
  }
});

export default router;
