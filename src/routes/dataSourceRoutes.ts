/**
 * Data Source Routes
 * 
 * API routes for the Unified Data Source Manager
 */

import { Router } from 'express';
import { DataSourceController } from '../controllers/DataSourceController.js';

const router = Router();
const controller = new DataSourceController();

// Market data endpoints
router.get('/market', (req, res) => controller.getMarketData(req, res));

// Sentiment endpoints
router.get('/sentiment', (req, res) => controller.getSentiment(req, res));

// News endpoints
router.get('/news', (req, res) => controller.getNews(req, res));

// HuggingFace extended endpoints
router.get('/huggingface/extended', (req, res) => controller.getHuggingFaceExtended(req, res));

// Health and status endpoints
router.get('/health', (req, res) => controller.getHealth(req, res));
router.get('/stats', (req, res) => controller.getStats(req, res));

// Mode management endpoints
router.get('/mode', (req, res) => controller.getMode(req, res));
router.post('/mode', (req, res) => controller.setMode(req, res));

// Source control endpoints
router.post('/:sourceName/disable', (req, res) => controller.disableSource(req, res));
router.post('/:sourceName/enable', (req, res) => controller.enableSource(req, res));

// Testing endpoint
router.get('/test', (req, res) => controller.testDataSources(req, res));

export default router;
