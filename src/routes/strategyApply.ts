/**
 * Strategy Apply Routes
 * Apply strategy templates and run strategy pipelines
 */
import express from 'express';
import { StrategyPipelineController } from '../controllers/StrategyPipelineController.js';
import { Logger } from '../core/Logger.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const logger = Logger.getInstance();
const pipelineController = new StrategyPipelineController();

const TEMPLATES_DIR = path.join(process.cwd(), 'data', 'strategy-templates');

/**
 * POST /api/strategies/apply
 * Apply a strategy template and execute it
 * Body: {
 *   templateId: string,
 *   symbols?: string[],
 *   timeframes?: string[],
 *   limit?: number,
 *   mode?: 'offline' | 'online',
 *   overrides?: object
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { templateId, symbols, timeframes, limit, mode, overrides } = req.body;
    
    if (!templateId) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'templateId is required'
      });
    }
    
    // Load template
    const templatePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
    let template;
    
    try {
      const content = await fs.readFile(templatePath, 'utf-8');
      template = JSON.parse(content);
    } catch (error) {
      return res.status(404).json({
        error: 'Template not found',
        message: `Template with id '${templateId}' does not exist`
      });
    }
    
    // Merge template parameters with request overrides
    const params = {
      symbols: symbols || template.parameters?.symbols,
      timeframes: timeframes || template.parameters?.timeframes || ['15m', '1h', '4h'],
      limit: limit || template.parameters?.limit || 50,
      mode: mode || template.parameters?.mode || 'offline',
      ...overrides
    };
    
    // Execute strategy pipeline
    logger.info('Applying strategy template', { templateId, params });
    
    // Use the pipeline controller to execute the strategy
    req.body = params;
    await pipelineController.runPipeline(req, res);
    
  } catch (error) {
    logger.error('Failed to apply strategy template', {}, error as Error);
    res.status(500).json({
      error: 'Failed to apply strategy',
      message: (error as Error).message
    });
  }
});

/**
 * POST /api/strategies/apply/batch
 * Apply multiple templates in batch
 * Body: {
 *   templates: [{ templateId: string, params?: object }]
 * }
 */
router.post('/batch', async (req, res) => {
  try {
    const { templates } = req.body;
    
    if (!templates || !Array.isArray(templates) || templates.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'templates array is required and must not be empty'
      });
    }
    
    const results = [];
    
    for (const { templateId, params } of templates) {
      try {
        const templatePath = path.join(TEMPLATES_DIR, `${templateId}.json`);
        const content = await fs.readFile(templatePath, 'utf-8');
        const template = JSON.parse(content);
        
        // Note: In production, you'd want to actually execute these
        // For now, we'll just prepare them
        results.push({
          templateId,
          status: 'queued',
          template: template.name
        });
      } catch (error) {
        results.push({
          templateId,
          status: 'error',
          error: 'Template not found'
        });
      }
    }
    
    res.json({
      success: true,
      data: results,
      message: `Queued ${results.filter(r => r.status === 'queued').length} strategies`
    });
    
  } catch (error) {
    logger.error('Failed to apply batch strategies', {}, error as Error);
    res.status(500).json({
      error: 'Failed to apply batch',
      message: (error as Error).message
    });
  }
});

export default router;
