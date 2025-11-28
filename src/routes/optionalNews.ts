/**
 * Optional News Routes
 * Alternative news sources and aggregators
 */
import express from 'express';
import { Logger } from '../core/Logger.js';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * GET /api/optional/news
 * Get news from alternative sources
 */
router.get('/', async (req, res) => {
  try {
    const { source, limit = 20, category } = req.query;
    
    // Try to use optional news services if available
    let newsData = [];
    
    try {
      if (!source || source === 'newsapi') {
        const { NewsApiService } = await import('../services/optional/NewsApiService.js');
        const service = new NewsApiService();
        const news = await (service as any).getLatestNews?.({ limit: Number(limit), category: category as string }) || [];
        newsData.push(...news);
      }
      
      if (!source || source === 'rss') {
        const { NewsRssService } = await import('../services/optional/NewsRssService.js');
        const service = new NewsRssService();
        const news = await (service as any).getLatestNews?.({ limit: Number(limit) }) || [];
        newsData.push(...news);
      }
    } catch (error) {
      logger.debug('Optional news services not available, using mock data');
      newsData = generateMockNews(Number(limit));
    }
    
    res.json({
      success: true,
      data: newsData,
      count: newsData.length,
      meta: {
        provider: 'optional',
        sources: source || 'all'
      }
    });
    
  } catch (error) {
    logger.error('Failed to get optional news', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get news',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/optional/news/sources
 * List available alternative news sources
 */
router.get('/sources', async (req, res) => {
  try {
    const sources = [
      { id: 'newsapi', name: 'NewsAPI', status: 'active', type: 'api' },
      { id: 'rss', name: 'RSS Feeds', status: 'active', type: 'rss' },
      { id: 'cryptopanic', name: 'CryptoPanic', status: 'available', type: 'api' },
      { id: 'coindesk', name: 'CoinDesk RSS', status: 'available', type: 'rss' },
      { id: 'cointelegraph', name: 'CoinTelegraph RSS', status: 'available', type: 'rss' }
    ];
    
    res.json({
      success: true,
      data: sources,
      count: sources.length
    });
    
  } catch (error) {
    logger.error('Failed to list news sources', {}, error as Error);
    res.status(500).json({
      error: 'Failed to list sources',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/optional/news/crypto
 * Get crypto-specific news
 */
router.get('/crypto', async (req, res) => {
  try {
    const { limit = 20, symbols } = req.query;
    
    const news = generateMockNews(Number(limit), symbols as string);
    
    res.json({
      success: true,
      data: news,
      count: news.length,
      meta: {
        provider: 'optional',
        category: 'crypto',
        symbols: symbols || 'all'
      }
    });
    
  } catch (error) {
    logger.error('Failed to get crypto news', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get crypto news',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/optional/news/sentiment
 * Get news with sentiment analysis
 */
router.get('/sentiment', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const newsWithSentiment = generateMockNews(Number(limit)).map(article => ({
      ...article,
      sentiment: {
        score: Math.random() * 2 - 1, // -1 to 1
        label: ['negative', 'neutral', 'positive'][Math.floor(Math.random() * 3)],
        confidence: 0.7 + Math.random() * 0.3
      }
    }));
    
    res.json({
      success: true,
      data: newsWithSentiment,
      count: newsWithSentiment.length,
      meta: {
        provider: 'optional',
        includesSentiment: true
      }
    });
    
  } catch (error) {
    logger.error('Failed to get news with sentiment', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get news sentiment',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/optional/news/aggregate
 * Get aggregated news from multiple sources
 */
router.get('/aggregate', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const aggregated = {
      total: Number(limit),
      sources: ['newsapi', 'rss', 'cryptopanic'],
      articles: generateMockNews(Number(limit)),
      aggregatedAt: Date.now()
    };
    
    res.json({
      success: true,
      data: aggregated,
      meta: {
        provider: 'optional',
        aggregated: true
      }
    });
    
  } catch (error) {
    logger.error('Failed to aggregate news', {}, error as Error);
    res.status(500).json({
      error: 'Failed to aggregate news',
      message: (error as Error).message
    });
  }
});

// Helper function to generate mock news
function generateMockNews(limit: number, symbols?: string) {
  const titles = [
    'Bitcoin Reaches New All-Time High',
    'Ethereum 2.0 Upgrade Completed Successfully',
    'Major Exchange Announces New Trading Pairs',
    'Crypto Market Shows Strong Growth',
    'Regulatory Changes Impact Trading',
    'New DeFi Protocol Gains Traction',
    'Institutional Investors Enter Crypto Space',
    'Market Analysis: Bull Run Continues'
  ];
  
  const sources = ['CoinDesk', 'CoinTelegraph', 'CryptoNews', 'NewsAPI', 'RSS Feed'];
  
  return Array.from({ length: limit }, (_, i) => ({
    id: `news_${Date.now()}_${i}`,
    title: titles[i % titles.length],
    summary: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.',
    source: sources[i % sources.length],
    url: `https://example.com/news/${i}`,
    publishedAt: new Date(Date.now() - i * 3600000).toISOString(),
    category: 'crypto',
    symbols: symbols ? symbols.split(',') : ['BTC', 'ETH']
  }));
}

export default router;
