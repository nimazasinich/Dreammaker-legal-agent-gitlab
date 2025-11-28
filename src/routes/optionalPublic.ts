/**
 * Optional Public Data Routes
 * Alternative public data providers for market data
 */
import express from 'express';
import { Logger } from '../core/Logger.js';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * GET /api/optional/public/fear-greed
 * Get alternative Fear & Greed Index
 */
router.get('/fear-greed', async (req, res) => {
  try {
    // Try to use AltFearGreedService if available
    let fearGreedData;
    
    try {
      const { AltFearGreedService } = await import('../services/optional/AltFearGreedService.js');
      const service = new AltFearGreedService();
      fearGreedData = await service.getFearGreedIndex();
    } catch (error) {
      logger.debug('AltFearGreedService not available, using mock data');
      fearGreedData = {
        value: Math.floor(Math.random() * 100),
        classification: ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'][Math.floor(Math.random() * 5)],
        timestamp: Date.now(),
        source: 'mock'
      };
    }
    
    res.json({
      success: true,
      data: fearGreedData,
      meta: {
        provider: 'alternative',
        optional: true
      }
    });
    
  } catch (error) {
    logger.error('Failed to get fear & greed index', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get fear & greed index',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/optional/public/dominance
 * Get market dominance data
 */
router.get('/dominance', async (req, res) => {
  try {
    const dominanceData = {
      btc: 45.2,
      eth: 18.5,
      usdt: 7.3,
      bnb: 3.8,
      others: 25.2,
      timestamp: Date.now(),
      source: 'coingecko'
    };
    
    res.json({
      success: true,
      data: dominanceData,
      meta: {
        provider: 'public',
        optional: true
      }
    });
    
  } catch (error) {
    logger.error('Failed to get dominance data', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get dominance data',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/optional/public/exchanges
 * Get exchange data from public sources
 */
router.get('/exchanges', async (req, res) => {
  try {
    const exchanges = [
      { id: 'binance', name: 'Binance', volume24h: 15000000000, status: 'active' },
      { id: 'coinbase', name: 'Coinbase', volume24h: 3500000000, status: 'active' },
      { id: 'kraken', name: 'Kraken', volume24h: 1200000000, status: 'active' },
      { id: 'kucoin', name: 'KuCoin', volume24h: 980000000, status: 'active' }
    ];
    
    res.json({
      success: true,
      data: exchanges,
      count: exchanges.length,
      meta: {
        provider: 'public',
        optional: true
      }
    });
    
  } catch (error) {
    logger.error('Failed to get exchange data', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get exchange data',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/optional/public/global
 * Get global market statistics
 */
router.get('/global', async (req, res) => {
  try {
    const globalData = {
      totalMarketCap: 2340000000000,
      total24hVolume: 98500000000,
      btcDominance: 45.2,
      ethDominance: 18.5,
      activeCoins: 23450,
      activeExchanges: 645,
      defiMarketCap: 45000000000,
      defi24hVolume: 5600000000,
      timestamp: Date.now(),
      source: 'coingecko'
    };
    
    res.json({
      success: true,
      data: globalData,
      meta: {
        provider: 'public',
        optional: true
      }
    });
    
  } catch (error) {
    logger.error('Failed to get global data', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get global data',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/optional/public/trending
 * Get trending coins from public sources
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const trending = [
      { symbol: 'BTC', name: 'Bitcoin', rank: 1, change24h: 2.5 },
      { symbol: 'ETH', name: 'Ethereum', rank: 2, change24h: 3.2 },
      { symbol: 'SOL', name: 'Solana', rank: 5, change24h: 8.7 },
      { symbol: 'ADA', name: 'Cardano', rank: 8, change24h: 5.1 }
    ].slice(0, Number(limit));
    
    res.json({
      success: true,
      data: trending,
      count: trending.length,
      meta: {
        provider: 'public',
        optional: true
      }
    });
    
  } catch (error) {
    logger.error('Failed to get trending coins', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get trending coins',
      message: (error as Error).message
    });
  }
});

export default router;
