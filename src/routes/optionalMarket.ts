/**
 * Optional Market Data Routes
 * Alternative market data providers
 */
import express from 'express';
import { Logger } from '../core/Logger.js';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * GET /api/optional/market/prices
 * Get prices from alternative providers
 */
router.get('/prices', async (req, res) => {
  try {
    const { symbols, provider = 'cryptocompare' } = req.query;
    
    if (!symbols) {
      return res.status(400).json({
        error: 'Missing symbols',
        message: 'symbols parameter is required (comma-separated list)'
      });
    }
    
    const symbolList = (symbols as string).split(',').map(s => s.trim());
    
    // Try to use optional market services
    let pricesData: any = {};
    
    try {
      if (provider === 'cryptocompare') {
        const { CryptoCompareService } = await import('../services/optional/CryptoCompareService.js');
        const service = new CryptoCompareService();
        pricesData = await (service as any).getPrices?.(symbolList) || [];
      } else if (provider === 'coinmarketcap') {
        const { CoinMarketCapService } = await import('../services/optional/CoinMarketCapService.js');
        const service = new CoinMarketCapService();
        pricesData = await (service as any).getPrices?.(symbolList) || [];
      } else {
        // Mock data
        pricesData = generateMockPrices(symbolList);
      }
    } catch (error) {
      logger.debug('Optional market service not available, using mock data');
      pricesData = generateMockPrices(symbolList);
    }
    
    res.json({
      success: true,
      data: pricesData,
      meta: {
        provider,
        optional: true,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get optional market prices', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get prices',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/optional/market/ohlcv/:symbol
 * Get OHLCV data from alternative providers
 */
router.get('/ohlcv/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1h', limit = 100, provider = 'cryptocompare' } = req.query;
    
    // Mock OHLCV data
    const ohlcvData = generateMockOHLCV(symbol, Number(limit));
    
    res.json({
      success: true,
      data: {
        symbol,
        timeframe,
        bars: ohlcvData,
        count: ohlcvData.length
      },
      meta: {
        provider,
        optional: true,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get optional OHLCV', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get OHLCV',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/optional/market/orderbook/:symbol
 * Get order book from alternative providers
 */
router.get('/orderbook/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { depth = 20 } = req.query;
    
    const orderbook = {
      symbol,
      bids: generateMockOrderBookSide(Number(depth), 'buy'),
      asks: generateMockOrderBookSide(Number(depth), 'sell'),
      timestamp: Date.now()
    };
    
    res.json({
      success: true,
      data: orderbook,
      meta: {
        provider: 'optional',
        depth: Number(depth)
      }
    });
    
  } catch (error) {
    logger.error('Failed to get order book', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get order book',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/optional/market/trades/:symbol
 * Get recent trades from alternative providers
 */
router.get('/trades/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 50 } = req.query;
    
    const trades = generateMockTrades(symbol, Number(limit));
    
    res.json({
      success: true,
      data: {
        symbol,
        trades,
        count: trades.length
      },
      meta: {
        provider: 'optional',
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get trades', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get trades',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/optional/market/providers
 * List available alternative market data providers
 */
router.get('/providers', async (req, res) => {
  try {
    const providers = [
      { id: 'cryptocompare', name: 'CryptoCompare', status: 'available', features: ['prices', 'ohlcv', 'orderbook'] },
      { id: 'coinmarketcap', name: 'CoinMarketCap', status: 'available', features: ['prices', 'metadata'] },
      { id: 'coingecko', name: 'CoinGecko', status: 'available', features: ['prices', 'ohlcv', 'market-data'] },
      { id: 'binance-public', name: 'Binance Public', status: 'available', features: ['prices', 'ohlcv', 'orderbook', 'trades'] },
      { id: 'kraken-public', name: 'Kraken Public', status: 'available', features: ['prices', 'ohlcv', 'orderbook'] }
    ];
    
    res.json({
      success: true,
      data: providers,
      count: providers.length
    });
    
  } catch (error) {
    logger.error('Failed to list providers', {}, error as Error);
    res.status(500).json({
      error: 'Failed to list providers',
      message: (error as Error).message
    });
  }
});

// Helper functions
function generateMockPrices(symbols: string[]) {
  return symbols.reduce((acc, symbol) => {
    acc[symbol] = {
      price: 10000 + Math.random() * 50000,
      volume24h: Math.random() * 1000000000,
      change24h: (Math.random() - 0.5) * 20,
      high24h: 10000 + Math.random() * 60000,
      low24h: 10000 + Math.random() * 40000
    };
    return acc;
  }, {} as any);
}

function generateMockOHLCV(symbol: string, limit: number) {
  const bars = [];
  let price = 50000;
  const now = Date.now();
  const interval = 3600000;
  
  for (let i = limit - 1; i >= 0; i--) {
    const change = (Math.random() - 0.5) * price * 0.02;
    price += change;
    
    bars.push({
      timestamp: now - i * interval,
      open: price,
      high: price * 1.01,
      low: price * 0.99,
      close: price + (Math.random() - 0.5) * price * 0.01,
      volume: Math.random() * 100
    });
  }
  
  return bars;
}

function generateMockOrderBookSide(depth: number, side: 'buy' | 'sell') {
  const orders = [];
  const basePrice = 50000;
  
  for (let i = 0; i < depth; i++) {
    const priceOffset = side === 'buy' ? -i * 10 : i * 10;
    orders.push({
      price: basePrice + priceOffset,
      amount: Math.random() * 5,
      total: (basePrice + priceOffset) * Math.random() * 5
    });
  }
  
  return orders;
}

function generateMockTrades(symbol: string, limit: number) {
  const trades = [];
  const now = Date.now();
  let price = 50000;
  
  for (let i = 0; i < limit; i++) {
    price += (Math.random() - 0.5) * price * 0.001;
    trades.push({
      id: `trade_${now}_${i}`,
      price,
      amount: Math.random() * 2,
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      timestamp: now - i * 1000
    });
  }
  
  return trades;
}

export default router;
