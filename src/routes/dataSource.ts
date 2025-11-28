/**
 * Data Source Routes
 *
 * Routes for managing data source configuration.
 */

import { Router } from 'express';
import { DataSourceController } from '../controllers/DataSourceController.js';

const router = Router();
const dataSourceController = new DataSourceController();

/**
 * GET /api/config/data-source
 * Get current data source configuration
 */
router.get('/data-source', dataSourceController.getMode.bind(dataSourceController));

/**
 * POST /api/config/data-source
 * Update primary data source (runtime override)
 */
router.post('/data-source', dataSourceController.setMode.bind(dataSourceController));

export default router;
