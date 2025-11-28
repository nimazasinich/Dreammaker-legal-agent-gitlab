/**
 * Futures Trading Routes
 * Handles futures trading operations including positions, orders, and margin management
 */
import express from 'express';
import { FuturesController } from '../controllers/FuturesController.js';

const router = express.Router();
const futuresController = new FuturesController();

/**
 * GET /api/futures/positions
 * List all open futures positions
 */
router.get('/positions', async (req, res) => {
  await futuresController.getPositions(req, res);
});

/**
 * POST /api/futures/order
 * Place a new futures order
 * Body: {
 *   symbol: string,
 *   side: 'BUY' | 'SELL',
 *   type: 'MARKET' | 'LIMIT',
 *   qty: number,
 *   price?: number,
 *   leverage?: number,
 *   stopLoss?: number,
 *   takeProfit?: number,
 *   reduceOnly?: boolean,
 *   marginMode?: 'ISOLATED' | 'CROSS'
 * }
 */
router.post('/order', async (req, res) => {
  await futuresController.placeOrder(req, res);
});

/**
 * DELETE /api/futures/position/:id
 * Close an existing futures position
 */
router.delete('/position/:id', async (req, res) => {
  await futuresController.closePosition(req, res);
});

/**
 * GET /api/futures/margin
 * Get margin account information
 */
router.get('/margin', async (req, res) => {
  await futuresController.getMarginInfo(req, res);
});

/**
 * GET /api/futures/orders
 * Get all orders (open and recent)
 */
router.get('/orders', async (req, res) => {
  await futuresController.getOrders(req, res);
});

/**
 * DELETE /api/futures/order/:id
 * Cancel a pending order
 */
router.delete('/order/:id', async (req, res) => {
  await futuresController.cancelOrder(req, res);
});

/**
 * POST /api/futures/leverage
 * Set leverage for a symbol
 * Body: { symbol: string, leverage: number }
 */
router.post('/leverage', async (req, res) => {
  await futuresController.setLeverage(req, res);
});

export default router;
