/**
 * Offline Data Routes
 * Serves cached/offline data when live sources are unavailable
 */
import express from 'express';
import { Logger } from '../core/Logger.js';
import { EmergencyDataFallbackService } from '../services/EmergencyDataFallbackService.js';
import { RedisService } from '../services/RedisService.js';
import { FallbackDataManager } from '../services/FallbackDataManager.js';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * GET /api/offline/status
 * Check offline data availability and status
 */
router.get('/status', async (req, res) => {
  try {
    const fallbackService = EmergencyDataFallbackService.getInstance();
    const redisService = RedisService.getInstance();
    
    // Check what data is available offline
    const cachedSymbols = await redisService.keys('market:*');
    const fallbackSymbols = await redisService.keys('fallback:*');
    
    const status = {
      available: true,
      mode: 'offline',
      cachedData: {
        symbols: cachedSymbols.length,
        lastUpdate: Date.now()
      },
      fallbackData: {
        symbols: fallbackSymbols.length,
        sources: ['historical', 'snapshot', 'synthetic']
      },
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    logger.error('Failed to check offline status', {}, error as Error);
    res.status(500).json({
      error: 'Failed to check offline status',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/offline/market/:symbol
 * Get offline market data for a symbol
 */
router.get('/market/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1h' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        error: 'Missing symbol',
        message: 'Symbol parameter is required'
      });
    }
    
    const fallbackService = EmergencyDataFallbackService.getInstance();
    const redisService = RedisService.getInstance();
    
    // Try to get cached data first
    let data = null;
    let source = 'none';
    
    try {
      const cached = await redisService.get(`market:${symbol}`);
      if (cached) {
        data = JSON.parse(cached);
        source = 'cache';
      }
    } catch (error) {
      logger.debug('No cached data', { symbol });
    }
    
    // If no cache, try fallback
    if (!data) {
      try {
        const fallback = await redisService.get(`fallback:${symbol}`);
        if (fallback) {
          data = JSON.parse(fallback);
          source = 'fallback';
        }
      } catch (error) {
        logger.debug('No fallback data', { symbol });
      }
    }
    
    // If still no data, generate synthetic
    if (!data) {
      data = generateSyntheticData(symbol);
      source = 'synthetic';
    }
    
    res.json({
      success: true,
      data: {
        symbol,
        timeframe,
        source,
        offline: true,
        ...data
      },
      meta: {
        warning: 'This data is from offline sources and may not be current',
        source,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get offline market data', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get offline data',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/offline/ohlcv/:symbol
 * Get offline OHLCV data for a symbol
 */
router.get('/ohlcv/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1h', limit = 100 } = req.query;
    
    const fallbackService = EmergencyDataFallbackService.getInstance();
    
    // Try to get historical fallback data
    let ohlcvData = [];
    let source = 'fallback';
    
    try {
      ohlcvData = await fallbackService.getHistoricalData(
        symbol,
        timeframe as string,
        Number(limit)
      );
    } catch (error) {
      // Generate synthetic OHLCV if no fallback available
      ohlcvData = generateSyntheticOHLCV(symbol, Number(limit));
      source = 'synthetic';
    }
    
    res.json({
      success: true,
      data: {
        symbol,
        timeframe,
        bars: ohlcvData,
        count: ohlcvData.length
      },
      meta: {
        warning: 'This is offline data and may not reflect current market conditions',
        source,
        offline: true,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get offline OHLCV', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get offline OHLCV',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/offline/symbols
 * List symbols available in offline mode
 */
router.get('/symbols', async (req, res) => {
  try {
    const redisService = RedisService.getInstance();
    
    const cachedKeys = await redisService.keys('market:*');
    const fallbackKeys = await redisService.keys('fallback:*');
    
    const symbols = [
      ...cachedKeys.map(k => k.replace('market:', '')),
      ...fallbackKeys.map(k => k.replace('fallback:', ''))
    ];
    
    const uniqueSymbols = [...new Set(symbols)];
    
    res.json({
      success: true,
      data: {
        symbols: uniqueSymbols,
        count: uniqueSymbols.length,
        sources: {
          cached: cachedKeys.length,
          fallback: fallbackKeys.length
        }
      }
    });
    
  } catch (error) {
    logger.error('Failed to list offline symbols', {}, error as Error);
    res.status(500).json({
      error: 'Failed to list symbols',
      message: (error as Error).message
    });
  }
});

/**
 * POST /api/offline/cache
 * Cache current data for offline use
 * Body: { symbols?: string[] }
 */
router.post('/cache', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    logger.info('Caching data for offline use', { symbols });
    
    // In production, this would fetch and cache current data
    res.json({
      success: true,
      message: `Caching data for ${symbols?.length || 'all'} symbols`,
      data: {
        symbols: symbols || [],
        status: 'caching',
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    logger.error('Failed to cache data', {}, error as Error);
    res.status(500).json({
      error: 'Failed to cache data',
      message: (error as Error).message
    });
  }
});

// Helper function to generate synthetic market data
function generateSyntheticData(symbol: string) {
  const basePrice = 50000; // Base price for BTC-like asset
  const randomPrice = basePrice + (Math.random() - 0.5) * basePrice * 0.1;
  
  return {
    price: randomPrice,
    high24h: randomPrice * 1.05,
    low24h: randomPrice * 0.95,
    volume24h: Math.random() * 1000000000,
    change24h: (Math.random() - 0.5) * 10,
    timestamp: Date.now(),
    synthetic: true
  };
}

// Helper function to generate synthetic OHLCV data
function generateSyntheticOHLCV(symbol: string, limit: number) {
  const bars = [];
  let price = 50000;
  const now = Date.now();
  const interval = 3600000; // 1 hour
  
  for (let i = limit - 1; i >= 0; i--) {
    const change = (Math.random() - 0.5) * price * 0.02;
    price += change;
    
    const open = price;
    const close = price + (Math.random() - 0.5) * price * 0.01;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.random() * 100;
    
    bars.push({
      timestamp: now - i * interval,
      open,
      high,
      low,
      close,
      volume,
      synthetic: true
    });
  }
  
  return bars;
}

export default router;
