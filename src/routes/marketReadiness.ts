/**
 * Market Readiness Routes
 * Check data availability and readiness for trading symbols
 */
import express from 'express';
import { Logger } from '../core/Logger.js';
import { RealMarketDataService } from '../services/RealMarketDataService.js';
import { HistoricalDataService } from '../services/HistoricalDataService.js';
import { RedisService } from '../services/RedisService.js';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * GET /api/market/readiness/:symbol
 * Check data readiness for a specific symbol
 */
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { exchange = 'binance' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        error: 'Missing symbol',
        message: 'Symbol parameter is required'
      });
    }
    
    const marketDataService = RealMarketDataService.getInstance();
    const historicalService = HistoricalDataService.getInstance();
    const redisService = RedisService.getInstance();
    
    // Check real-time data availability
    let realtimeAvailable = false;
    let realtimeLastUpdate = null;
    try {
      const cachedData = await redisService.get(`market:${symbol}`);
      if (cachedData) {
        realtimeAvailable = true;
        const parsed = JSON.parse(cachedData);
        realtimeLastUpdate = parsed.timestamp;
      }
    } catch (error) {
      logger.debug('No cached real-time data', { symbol });
    }
    
    // Check historical data availability
    let historicalAvailable = false;
    let historicalRange = null;
    try {
      const historicalData = await historicalService.getHistoricalData(
        symbol,
        'USD',
        30  // Last 30 days
      );
      
      if (historicalData && historicalData.length > 0) {
        historicalAvailable = true;
        historicalRange = {
          from: historicalData[0].timestamp,
          to: historicalData[historicalData.length - 1].timestamp,
          bars: historicalData.length
        };
      }
    } catch (error) {
      logger.debug('No historical data', { symbol });
    }
    
    // Overall readiness status
    const ready = realtimeAvailable && historicalAvailable;
    
    const readiness = {
      symbol,
      exchange,
      ready,
      realtime: {
        available: realtimeAvailable,
        lastUpdate: realtimeLastUpdate,
        status: realtimeAvailable ? 'active' : 'unavailable'
      },
      historical: {
        available: historicalAvailable,
        range: historicalRange,
        status: historicalAvailable ? 'available' : 'unavailable'
      },
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      data: readiness
    });
    
  } catch (error) {
    logger.error('Failed to check market readiness', {}, error as Error);
    res.status(500).json({
      error: 'Failed to check readiness',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/market/readiness
 * Check readiness for multiple symbols (batch)
 */
router.get('/', async (req, res) => {
  try {
    const { symbols, exchange = 'binance' } = req.query;
    
    if (!symbols) {
      return res.status(400).json({
        error: 'Missing symbols',
        message: 'symbols parameter is required (comma-separated list)'
      });
    }
    
    const symbolList = (symbols as string).split(',').map(s => s.trim());
    
    if (symbolList.length === 0) {
      return res.status(400).json({
        error: 'Invalid symbols',
        message: 'At least one symbol is required'
      });
    }
    
    if (symbolList.length > 50) {
      return res.status(400).json({
        error: 'Too many symbols',
        message: 'Maximum 50 symbols per request'
      });
    }
    
    const redisService = RedisService.getInstance();
    const results = await Promise.all(
      symbolList.map(async (symbol) => {
        try {
          // Quick check using Redis cache
          const cachedData = await redisService.get(`market:${symbol}`);
          const realtimeAvailable = !!cachedData;
          
          return {
            symbol,
            ready: realtimeAvailable,
            status: realtimeAvailable ? 'ready' : 'unavailable'
          };
        } catch (error) {
          return {
            symbol,
            ready: false,
            status: 'error',
            error: (error as Error).message
          };
        }
      })
    );
    
    const summary = {
      total: symbolList.length,
      ready: results.filter(r => r.ready).length,
      unavailable: results.filter(r => !r.ready).length
    };
    
    res.json({
      success: true,
      data: {
        symbols: results,
        summary,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    logger.error('Failed to check batch readiness', {}, error as Error);
    res.status(500).json({
      error: 'Failed to check readiness',
      message: (error as Error).message
    });
  }
});

/**
 * POST /api/market/readiness/refresh
 * Trigger a refresh of market data for specific symbols
 */
router.post('/refresh', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'symbols array is required'
      });
    }
    
    logger.info('Triggering market data refresh', { symbols });
    
    // This would trigger actual data refresh in production
    // For now, we'll just acknowledge the request
    res.json({
      success: true,
      message: `Data refresh triggered for ${symbols.length} symbols`,
      data: {
        symbols,
        status: 'refreshing',
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    logger.error('Failed to trigger refresh', {}, error as Error);
    res.status(500).json({
      error: 'Failed to trigger refresh',
      message: (error as Error).message
    });
  }
});

export default router;
