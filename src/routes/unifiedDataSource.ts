/**
 * Unified Data Source Routes
 * 
 * API routes for unified data source management
 */

import { Router } from 'express';
import { unifiedDataSourceController } from '../controllers/UnifiedDataSourceController.js';

const router = Router();

// Configuration endpoints
router.get('/config', (req, res) => unifiedDataSourceController.getConfig(req, res));
router.post('/config', (req, res) => unifiedDataSourceController.updateConfig(req, res));

// Data fetching endpoints
router.get('/market/:symbol', (req, res) => unifiedDataSourceController.getMarketData(req, res));
router.post('/sentiment', (req, res) => unifiedDataSourceController.getSentiment(req, res));
router.post('/prediction', (req, res) => unifiedDataSourceController.getPrediction(req, res));

// Monitoring endpoints
router.get('/metrics', (req, res) => unifiedDataSourceController.getMetrics(req, res));
router.get('/report', (req, res) => unifiedDataSourceController.getReport(req, res));
router.get('/health', (req, res) => unifiedDataSourceController.getHealth(req, res));

// Stored data endpoint
router.get('/stored', (req, res) => unifiedDataSourceController.getStoredData(req, res));

// Cache management
router.delete('/cache', (req, res) => unifiedDataSourceController.clearCache(req, res));

// Metrics management
router.post('/metrics/reset', (req, res) => unifiedDataSourceController.resetMetrics(req, res));

export default router;
