/**
 * News API Configuration
 * Update these settings to customize the news feed
 */

export const NEWS_CONFIG = {
  // News API Settings
  apiKey: '968a5e25552b4cb5ba3280361d8444ab',
  baseUrl: 'https://newsapi.org/v2',
  
  // Search Parameters
  defaultQuery: 'cryptocurrency OR bitcoin OR ethereum OR crypto',
  language: 'en',
  pageSize: 100,
  daysBack: 7, // How many days back to fetch news
  
  // Refresh Settings
  autoRefreshInterval: 60000, // 60 seconds
  cacheEnabled: true,
  
  // Display Settings
  showImages: true,
  showAuthor: true,
  showSentiment: true,
  
  // Sentiment Keywords
  sentimentKeywords: {
    positive: ['surge', 'rise', 'gain', 'bullish', 'high', 'profit', 'success', 'growth', 'rally', 'boost', 'soar'],
    negative: ['fall', 'drop', 'crash', 'bearish', 'low', 'loss', 'decline', 'plunge', 'risk', 'slump', 'tumble']
  }
};

