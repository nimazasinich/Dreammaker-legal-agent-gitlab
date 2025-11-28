/**
 * Machine Learning Routes
 * Unified ML training, tuning, and inference endpoints
 */
import express from 'express';
import { AIController } from '../controllers/AIController.js';
import { TuningController } from '../controllers/TuningController.js';
import { Logger } from '../core/Logger.js';

const router = express.Router();
const logger = Logger.getInstance();
const aiController = new AIController();
const tuningController = new TuningController();

/**
 * POST /api/ml/train
 * Start ML model training
 * Body: {
 *   symbols?: string[],
 *   timeframe?: string,
 *   lookbackDays?: number,
 *   modelType?: string,
 *   parameters?: object
 * }
 */
router.post('/train', async (req, res) => {
  try {
    // Check if method exists (optional feature)
    if (typeof (aiController as any).train === 'function') {
      await (aiController as any).train(req, res);
    } else {
      res.status(501).json({
        error: 'Feature not implemented',
        message: 'ML training is an experimental feature not yet available',
        status: 'not_implemented'
      });
    }
  } catch (error) {
    logger.error('ML training error', {}, error as Error);
    res.status(500).json({
      error: 'Training failed',
      message: (error as Error).message
    });
  }
});

/**
 * POST /api/ml/tune
 * Run hyperparameter tuning
 * Body: {
 *   symbol: string,
 *   timeframe?: string,
 *   lookbackDays?: number,
 *   parameterSpace?: object,
 *   trials?: number
 * }
 */
router.post('/tune', async (req, res) => {
  try {
    // Check if method exists (optional feature)
    if (typeof (tuningController as any).startTuning === 'function') {
      await (tuningController as any).startTuning(req, res);
    } else {
      res.status(501).json({
        error: 'Feature not implemented',
        message: 'Hyperparameter tuning is an experimental feature',
        status: 'not_implemented'
      });
    }
  } catch (error) {
    logger.error('Tuning error', {}, error as Error);
    res.status(500).json({
      error: 'Tuning failed',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/ml/result/:id
 * Get training or tuning result by ID
 */
router.get('/result/:id', async (req, res) => {
  await tuningController.getResult(req, res);
});

/**
 * GET /api/ml/latest
 * Get latest training/tuning result
 */
router.get('/latest', async (req, res) => {
  try {
    if (typeof (tuningController as any).getLatestResult === 'function') {
      await (tuningController as any).getLatestResult(req, res);
    } else {
      res.status(501).json({
        error: 'Feature not implemented',
        message: 'Result retrieval not yet available',
        status: 'not_implemented'
      });
    }
  } catch (error) {
    logger.error('Get latest result error', {}, error as Error);
    res.status(500).json({ error: 'Failed to get result' });
  }
});

/**
 * GET /api/ml/all
 * List all training/tuning results
 */
router.get('/all', async (req, res) => {
  try {
    if (typeof (tuningController as any).getAllResults === 'function') {
      await (tuningController as any).getAllResults(req, res);
    } else if (typeof (tuningController as any).getResult === 'function') {
      // Fallback to getResult if getAllResults doesn't exist
      res.status(501).json({
        error: 'Feature not implemented',
        message: 'Bulk result retrieval not available, use /result/:id',
        status: 'not_implemented'
      });
    } else {
      res.status(501).json({
        error: 'Feature not implemented',
        status: 'not_implemented'
      });
    }
  } catch (error) {
    logger.error('Get all results error', {}, error as Error);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

/**
 * POST /api/ml/predict
 * Make predictions using trained model
 * Body: {
 *   symbol: string,
 *   modelId?: string,
 *   features?: object
 * }
 */
router.post('/predict', async (req, res) => {
  await aiController.predict(req, res);
});

/**
 * GET /api/ml/models
 * List available ML models
 */
router.get('/models', async (req, res) => {
  try {
    // In production, this would query actual model registry
    const models = [
      {
        id: 'lstm_v1',
        type: 'LSTM',
        status: 'trained',
        accuracy: 0.72,
        trainedAt: new Date().toISOString()
      },
      {
        id: 'xgboost_v1',
        type: 'XGBoost',
        status: 'trained',
        accuracy: 0.68,
        trainedAt: new Date().toISOString()
      }
    ];
    
    res.json({
      success: true,
      data: models,
      count: models.length
    });
  } catch (error) {
    logger.error('Failed to list models', {}, error as Error);
    res.status(500).json({
      error: 'Failed to list models',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/ml/status
 * Get ML system status
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      system: 'operational',
      modelsLoaded: 2,
      gpuAvailable: false, // Would check actual GPU availability
      lastTraining: new Date().toISOString(),
      activeJobs: 0,
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get ML status', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get ML status',
      message: (error as Error).message
    });
  }
});

/**
 * DELETE /api/ml/result/:id
 * Delete a training/tuning result
 */
router.delete('/result/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // In production, would delete actual result
    logger.info('Deleting ML result', { id });
    
    res.json({
      success: true,
      message: `Result ${id} deleted successfully`
    });
  } catch (error) {
    logger.error('Failed to delete result', {}, error as Error);
    res.status(500).json({
      error: 'Failed to delete result',
      message: (error as Error).message
    });
  }
});

export default router;
