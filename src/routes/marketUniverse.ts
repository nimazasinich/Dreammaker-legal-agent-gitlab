/**
 * Market Universe Routes
 * Provides information about supported symbols and exchanges
 */
import express from 'express';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { BinanceService } from '../services/BinanceService.js';
import { KuCoinService } from '../services/KuCoinService.js';

const router = express.Router();
const logger = Logger.getInstance();
const config = ConfigManager.getInstance();

/**
 * GET /api/market/universe
 * List all supported symbols and exchanges
 */
router.get('/', async (req, res) => {
  try {
    const { exchange, type } = req.query;
    
    // Get supported exchanges from config
    const exchanges = config.get('exchanges') || {
      binance: { enabled: true, name: 'Binance' },
      kucoin: { enabled: true, name: 'KuCoin' }
    };
    
    // Get symbols from services
    const binanceService = BinanceService.getInstance();
    const kucoinService = KuCoinService.getInstance();
    
    const universe: any = {
      exchanges: [],
      totalSymbols: 0,
      timestamp: Date.now()
    };
    
    // Add Binance data if enabled and requested
    if ((!exchange || exchange === 'binance') && exchanges.binance?.enabled) {
      try {
        const binanceSymbols = await binanceService.getAllSymbols();
        universe.exchanges.push({
          id: 'binance',
          name: 'Binance',
          symbols: binanceSymbols.length,
          types: ['spot', 'futures'],
          status: 'active'
        });
        universe.totalSymbols += binanceSymbols.length;
      } catch (error) {
        logger.error('Failed to fetch Binance symbols', {}, error as Error);
      }
    }
    
    // Add KuCoin data if enabled and requested
    if ((!exchange || exchange === 'kucoin') && exchanges.kucoin?.enabled) {
      try {
        const kucoinSymbols = await kucoinService.getAllSymbols();
        universe.exchanges.push({
          id: 'kucoin',
          name: 'KuCoin',
          symbols: kucoinSymbols.length,
          types: ['spot', 'futures'],
          status: 'active'
        });
        universe.totalSymbols += kucoinSymbols.length;
      } catch (error) {
        logger.error('Failed to fetch KuCoin symbols', {}, error as Error);
      }
    }
    
    res.json({
      success: true,
      data: universe
    });
    
  } catch (error) {
    logger.error('Failed to get market universe', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get market universe',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/market/universe/:exchange
 * Get symbols for a specific exchange
 */
router.get('/:exchange', async (req, res) => {
  try {
    const { exchange } = req.params;
    const { type = 'spot', limit = 100, offset = 0 } = req.query;
    
    let symbols: any[] = [];
    
    if (exchange === 'binance') {
      const binanceService = BinanceService.getInstance();
      symbols = await binanceService.getAllSymbols();
    } else if (exchange === 'kucoin') {
      const kucoinService = KuCoinService.getInstance();
      symbols = await kucoinService.getAllSymbols();
    } else {
      return res.status(400).json({
        error: 'Invalid exchange',
        message: `Exchange '${exchange}' is not supported`
      });
    }
    
    // Apply pagination
    const total = symbols.length;
    const paginatedSymbols = symbols.slice(Number(offset), Number(offset) + Number(limit));
    
    res.json({
      success: true,
      data: {
        exchange,
        type,
        symbols: paginatedSymbols,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total
        }
      }
    });
    
  } catch (error) {
    logger.error('Failed to get exchange symbols', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get exchange symbols',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/market/universe/search/:query
 * Search for symbols across all exchanges
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { exchange, limit = 50 } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'Search query must be at least 2 characters'
      });
    }
    
    const results: any[] = [];
    const searchQuery = query.toUpperCase();
    
    // Search Binance
    if (!exchange || exchange === 'binance') {
      try {
        const binanceService = BinanceService.getInstance();
        const binanceSymbols = await binanceService.getAllSymbols();
        const matches = binanceSymbols
          .filter((s: string) => s.includes(searchQuery))
          .slice(0, Number(limit) / 2);
        
        results.push(...matches.map((symbol: string) => ({
          symbol,
          exchange: 'binance',
          type: 'spot'
        })));
      } catch (error) {
        logger.error('Failed to search Binance', {}, error as Error);
      }
    }
    
    // Search KuCoin
    if (!exchange || exchange === 'kucoin') {
      try {
        const kucoinService = KuCoinService.getInstance();
        const kucoinSymbols = await kucoinService.getAllSymbols();
        const matches = kucoinSymbols
          .filter((s: string) => s.includes(searchQuery))
          .slice(0, Number(limit) / 2);
        
        results.push(...matches.map((symbol: string) => ({
          symbol,
          exchange: 'kucoin',
          type: 'spot'
        })));
      } catch (error) {
        logger.error('Failed to search KuCoin', {}, error as Error);
      }
    }
    
    res.json({
      success: true,
      data: {
        query,
        results,
        count: results.length
      }
    });
    
  } catch (error) {
    logger.error('Failed to search symbols', {}, error as Error);
    res.status(500).json({
      error: 'Failed to search symbols',
      message: (error as Error).message
    });
  }
});

export default router;
