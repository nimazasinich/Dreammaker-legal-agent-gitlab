/**
 * News Routes
 * News aggregation and sentiment analysis endpoints
 */
import express from 'express';
import { Logger } from '../core/Logger.js';
import { SentimentNewsService } from '../services/SentimentNewsService.js';
import { SentimentAnalysisService } from '../services/SentimentAnalysisService.js';
import { UnifiedNewsService } from '../services/UnifiedNewsService.js';

const router = express.Router();
const logger = Logger.getInstance();

/**
 * GET /api/news/latest
 * Fetch latest market news
 */
router.get('/latest', async (req, res) => {
  try {
    const { limit = 20, category, language = 'en' } = req.query;
    
    const newsService = SentimentNewsService.getInstance();
    const news = await (newsService as any).getLatestNews?.({
      limit: Number(limit),
      category: category as string,
      language: language as string
    }) || [];
    
    res.json({
      success: true,
      data: news,
      count: news.length,
      timestamp: Date.now()
    });
    
  } catch (error) {
    logger.error('Failed to fetch latest news', {}, error as Error);
    res.status(500).json({
      error: 'Failed to fetch news',
      message: (error as Error).message
    });
  }
});

/**
 * POST /api/news/analyze
 * Analyze sentiment of a news article or text
 * Body: {
 *   text: string,
 *   title?: string,
 *   source?: string
 * }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { text, title, source } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: 'Missing text',
        message: 'text field is required for sentiment analysis'
      });
    }
    
    const sentimentService = SentimentAnalysisService.getInstance();
    const analysis = await sentimentService.analyzeSentiment(text);
    
    res.json({
      success: true,
      data: {
        text: text.substring(0, 100) + '...',
        title,
        source,
        sentiment: analysis,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    logger.error('Failed to analyze sentiment', {}, error as Error);
    res.status(500).json({
      error: 'Failed to analyze sentiment',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/news/sentiment/:symbol
 * Get aggregated sentiment for a specific symbol
 */
router.get('/sentiment/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { hours = 24 } = req.query;
    
    const sentimentService = SentimentAnalysisService.getInstance();
    const sentiment = await (sentimentService as any).getSymbolSentiment?.(
      symbol,
      Number(hours)
    ) || { score: 0, label: 'neutral', volume: 0 };
    
    res.json({
      success: true,
      data: {
        symbol,
        sentiment,
        timeframe: `${hours}h`,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get symbol sentiment', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get sentiment',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/news/trending
 * Get trending news topics
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const newsService = SentimentNewsService.getInstance();
    const trending = await (newsService as any).getTrendingTopics?.(Number(limit)) || [];
    
    res.json({
      success: true,
      data: trending,
      count: trending.length,
      timestamp: Date.now()
    });
    
  } catch (error) {
    logger.error('Failed to get trending topics', {}, error as Error);
    res.status(500).json({
      error: 'Failed to get trending topics',
      message: (error as Error).message
    });
  }
});

/**
 * GET /api/news/sources
 * List available news sources
 */
router.get('/sources', async (req, res) => {
  try {
    const sources = [
      { id: 'cryptopanic', name: 'CryptoPanic', status: 'active', type: 'aggregator' },
      { id: 'coindesk', name: 'CoinDesk', status: 'active', type: 'publisher' },
      { id: 'cointelegraph', name: 'CoinTelegraph', status: 'active', type: 'publisher' },
      { id: 'newsapi', name: 'NewsAPI', status: 'active', type: 'aggregator' },
      { id: 'rss', name: 'RSS Feeds', status: 'active', type: 'aggregator' }
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
 * POST /api/news/batch-analyze
 * Analyze sentiment for multiple news items
 * Body: {
 *   items: [{ text: string, id?: string }]
 * }
 */
router.post('/batch-analyze', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'items array is required and must not be empty'
      });
    }
    
    if (items.length > 50) {
      return res.status(400).json({
        error: 'Too many items',
        message: 'Maximum 50 items per batch'
      });
    }
    
    const sentimentService = SentimentAnalysisService.getInstance();
    const results = await Promise.all(
      items.map(async (item) => {
        try {
          const sentiment = await sentimentService.analyzeSentiment(item.text);
          return {
            id: item.id,
            sentiment,
            status: 'success'
          };
        } catch (error) {
          return {
            id: item.id,
            status: 'error',
            error: (error as Error).message
          };
        }
      })
    );
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
    
  } catch (error) {
    logger.error('Failed to batch analyze', {}, error as Error);
    res.status(500).json({
      error: 'Failed to batch analyze',
      message: (error as Error).message
    });
  }
});

export default router;
