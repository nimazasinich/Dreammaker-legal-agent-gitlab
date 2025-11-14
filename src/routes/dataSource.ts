/**
 * Data Source Routes
 *
 * Routes for managing data source configuration.
 */

import { Router } from 'express';
import { dataSourceController } from '../controllers/DataSourceController.js';

const router = Router();

/**
 * GET /api/config/data-source
 * Get current data source configuration
 */
router.get('/data-source', dataSourceController.getDataSourceConfig);

/**
 * POST /api/config/data-source
 * Update primary data source (runtime override)
 */
router.post('/data-source', dataSourceController.setDataSourceConfig);

export default router;
