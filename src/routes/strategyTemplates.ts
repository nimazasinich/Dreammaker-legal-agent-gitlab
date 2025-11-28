/**
 * Strategy Templates Routes
 * CRUD operations for strategy templates
 */
import express from 'express';
import { Logger } from '../core/Logger.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const logger = Logger.getInstance();

// Template storage directory
const TEMPLATES_DIR = path.join(process.cwd(), 'data', 'strategy-templates');

// Ensure templates directory exists
async function ensureTemplatesDir() {
  try {
    await fs.mkdir(TEMPLATES_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create templates directory', {}, error as Error);
  }
}

ensureTemplatesDir();

/**
 * GET /api/strategies/templates
 * List all strategy templates
 */
router.get('/', async (req, res) => {
  try {
    const files = await fs.readdir(TEMPLATES_DIR);
    const templates = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (file) => {
          try {
            const content = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf-8');
            return JSON.parse(content);
          } catch (error) {
            logger.error(`Failed to read template ${file}`, {}, error as Error);
            return null;
          }
        })
    );

    res.json({
      success: true,
      data: templates.filter(t => t !== null),
      count: templates.filter(t => t !== null).length
    });
  } catch (error) {
    logger.error('Failed to list templates', {}, error as Error);
    res.status(500).json({
      error: 'Failed to list templates',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/strategies/templates/:id
 * Get a specific strategy template
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const template = JSON.parse(content);
      
      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      res.status(404).json({
        error: 'Template not found',
        message: `Template with id '${id}' does not exist`
      });
    }
  } catch (error) {
    logger.error('Failed to get template', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get template',
      message: (error as Error).message
    });
  }
});

/**
 * POST /api/strategies/templates
 * Create a new strategy template
 * Body: {
 *   id: string,
 *   name: string,
 *   description: string,
 *   strategy: object,
 *   parameters: object
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { id, name, description, strategy, parameters } = req.body;
    
    if (!id || !name || !strategy) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'id, name, and strategy are required'
      });
    }
    
    const template = {
      id,
      name,
      description: description || '',
      strategy,
      parameters: parameters || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(template, null, 2));
    
    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully'
    });
  } catch (error) {
    logger.error('Failed to create template', {}, error as Error);
    res.status(500).json({
      error: 'Failed to create template',
      message: (error as Error).message
    });
  }
});

/**
 * PUT /api/strategies/templates/:id
 * Update an existing strategy template
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const existing = JSON.parse(content);
      
      const updated = {
        ...existing,
        ...req.body,
        id, // Ensure ID doesn't change
        updatedAt: new Date().toISOString()
      };
      
      await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
      
      res.json({
        success: true,
        data: updated,
        message: 'Template updated successfully'
      });
    } catch (error) {
      res.status(404).json({
        error: 'Template not found',
        message: `Template with id '${id}' does not exist`
      });
    }
  } catch (error) {
    logger.error('Failed to update template', {}, error as Error);
    res.status(500).json({
      error: 'Failed to update template',
      message: (error as Error).message
    });
  }
});

/**
 * DELETE /api/strategies/templates/:id
 * Delete a strategy template
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = path.join(TEMPLATES_DIR, `${id}.json`);
    
    try {
      await fs.unlink(filePath);
      
      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      res.status(404).json({
        error: 'Template not found',
        message: `Template with id '${id}' does not exist`
      });
    }
  } catch (error) {
    logger.error('Failed to delete template', {}, error as Error);
    res.status(500).json({
      error: 'Failed to delete template',
      message: (error as Error).message
    });
  }
});

export default router;
