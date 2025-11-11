/**
 * Alternate Registry Service
 * Parses api - Copy.txt and provides alternate sources for market/news/sentiment data
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '../core/Logger.js';

export interface AlternateSource {
  name: string;
  baseUrl: string;
  key?: string;
  type: 'primary' | 'fallback';
}

export interface CategorySources {
  market: AlternateSource[];
  news: AlternateSource[];
  sentiment: AlternateSource[];
  blockchain: AlternateSource[];
  whale: AlternateSource[];
  onchain: AlternateSource[];
}

/**
 * Alternate Registry Service
 * Manages alternate API sources from configuration file
 */
export class AlternateRegistryService {
  private static instance: AlternateRegistryService;
  private logger = Logger.getInstance();
  private registry: CategorySources = {
    market: [],
    news: [],
    sentiment: [],
    blockchain: [],
    whale: [],
    onchain: []
  };
  private initialized = false;

  private constructor() {}

  static getInstance(): AlternateRegistryService {
    if (!AlternateRegistryService.instance) {
      AlternateRegistryService.instance = new AlternateRegistryService();
    }
    return AlternateRegistryService.instance;
  }

  /**
   * Initialize registry from api - Copy.txt file
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    try {
      const filePath = path.join(process.cwd(), 'api - Copy.txt');

      if (!fs.existsSync(filePath)) {
        this.logger.warn('api - Copy.txt file not found, using default registry');
        this.loadDefaultRegistry();
        this.initialized = true;
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      this.parseRegistry(content);
      this.initialized = true;

      this.logger.info('Alternate registry initialized', {
        market: this.registry.market.length,
        news: this.registry.news.length,
        sentiment: this.registry.sentiment.length,
        blockchain: this.registry.blockchain.length,
        whale: this.registry.whale.length,
        onchain: this.registry.onchain.length
      });
    } catch (error) {
      this.logger.error('Failed to initialize alternate registry', {}, error as Error);
      this.loadDefaultRegistry();
      this.initialized = true;
    }
  }

  /**
   * Parse registry content from file
   */
  private parseRegistry(content: string): void {
    // Extract API keys from top of file
    const keys: Record<string, string> = {};
    const lines = content.split('\n');

    // Parse keys section
    for (const line of lines) {
      const trimmed = line.trim();

      // Extract key-value pairs
      const keyMatch = trimmed.match(/^(\w+)[_:]?\s*$/i);
      const valueMatch = trimmed.match(/^([A-Za-z0-9\-]+)$/);

      if (keyMatch && lines.indexOf(line) < 30) {
        const nextLine = lines[lines.indexOf(line) + 1]?.trim();
        if (nextLine && /^[A-Za-z0-9\-]{20,}$/.test(nextLine)) {
          keys[keyMatch[1].toLowerCase()] = nextLine;
        }
      }
    }

    // Define market-related keywords
    const marketKeywords = ['coinmarketcap', 'coingecko', 'cryptocompare', 'nomics', 'messari',
                            'bravenewcoin', 'kaiko', 'coinapi', 'price', 'ohlcv', 'market'];
    const newsKeywords = ['newsapi', 'cryptopanic', 'cryptocontrol', 'coindesk', 'cointelegraph',
                          'cryptoslate', 'theblock', 'news', 'article'];
    const sentimentKeywords = ['alternative', 'santiment', 'lunarcrush', 'thetie', 'cryptoquant',
                               'glassnode', 'sentiment', 'mood', 'fear', 'greed', 'social'];
    const blockchainKeywords = ['tronscan', 'bscscan', 'etherscan', 'infura', 'alchemy',
                                'blockchair', 'covalent', 'explorer'];
    const whaleKeywords = ['whalealert', 'arkham', 'whale', 'nansen'];
    const onchainKeywords = ['glassnode', 'intotheblock', 'thegraph', 'onchain', 'analytics'];

    // Parse API sources from content
    const apiRegex = /https?:\/\/[^\s<>"\)]+/gi;
    const matches = content.matchAll(apiRegex);

    for (const match of matches) {
      const url = match[0];
      const lowerUrl = url.toLowerCase();

      // Extract domain name
      const domainMatch = url.match(/https?:\/\/([^\/]+)/i);
      if (!domainMatch) continue;

      const domain = domainMatch[1];
      const name = domain.split('.')[0];

      // Determine category based on URL and keywords
      let category: keyof CategorySources | null = null;

      if (marketKeywords.some(k => lowerUrl.includes(k))) {
        category = 'market';
      } else if (newsKeywords.some(k => lowerUrl.includes(k))) {
        category = 'news';
      } else if (sentimentKeywords.some(k => lowerUrl.includes(k))) {
        category = 'sentiment';
      } else if (blockchainKeywords.some(k => lowerUrl.includes(k))) {
        category = 'blockchain';
      } else if (whaleKeywords.some(k => lowerUrl.includes(k))) {
        category = 'whale';
      } else if (onchainKeywords.some(k => lowerUrl.includes(k))) {
        category = 'onchain';
      }

      if (category) {
        // Extract base URL (without query params)
        const baseUrl = url.split('?')[0].replace(/\/[^\/]*$/, '');

        // Check if already added
        const exists = this.registry[category].some(s => s.baseUrl === baseUrl);
        if (!exists) {
          this.registry[category].push({
            name,
            baseUrl,
            key: keys[name.toLowerCase()] || '',
            type: 'fallback'
          });
        }
      }
    }

    // Add known primary sources with keys
    this.addPrimarySources(keys);
  }

  /**
   * Add primary sources with keys from file
   */
  private addPrimarySources(keys: Record<string, string>): void {
    // Market data
    if (keys.coinmarketcap || keys.cmc) {
      this.registry.market.unshift({
        name: 'coinmarketcap',
        baseUrl: 'https://pro-api.coinmarketcap.com/v1',
        key: keys.coinmarketcap || keys.cmc || '',
        type: 'primary'
      });
    }

    if (keys.cryptocompare) {
      this.registry.market.unshift({
        name: 'cryptocompare',
        baseUrl: 'https://min-api.cryptocompare.com/data',
        key: keys.cryptocompare || '',
        type: 'primary'
      });
    }

    // News
    if (keys.newsapi) {
      this.registry.news.unshift({
        name: 'newsapi',
        baseUrl: 'https://newsapi.org/v2',
        key: keys.newsapi || '',
        type: 'primary'
      });
    }

    // Blockchain explorers
    if (keys.etherscan || keys.eherscann) {
      this.registry.blockchain.unshift({
        name: 'etherscan',
        baseUrl: 'https://api.etherscan.io/api',
        key: keys.etherscan || keys.eherscann || '',
        type: 'primary'
      });
    }

    if (keys.bscscan) {
      this.registry.blockchain.unshift({
        name: 'bscscan',
        baseUrl: 'https://api.bscscan.com/api',
        key: keys.bscscan || '',
        type: 'primary'
      });
    }

    if (keys.tronscan) {
      this.registry.blockchain.unshift({
        name: 'tronscan',
        baseUrl: 'https://api.tronscan.org/api',
        key: keys.tronscan || '',
        type: 'primary'
      });
    }
  }

  /**
   * Load default registry when file is not available
   */
  private loadDefaultRegistry(): void {
    this.registry = {
      market: [
        { name: 'coingecko', baseUrl: 'https://api.coingecko.com/api/v3', key: '', type: 'primary' },
        { name: 'binance', baseUrl: 'https://api.binance.com/api/v3', key: '', type: 'fallback' }
      ],
      news: [
        { name: 'cryptopanic', baseUrl: 'https://cryptopanic.com/api/v1', key: '', type: 'primary' }
      ],
      sentiment: [
        { name: 'alternativeMe', baseUrl: 'https://api.alternative.me/fng', key: '', type: 'primary' }
      ],
      blockchain: [
        { name: 'etherscan', baseUrl: 'https://api.etherscan.io/api', key: '', type: 'primary' }
      ],
      whale: [],
      onchain: []
    };
  }

  /**
   * Get sources by category
   */
  getSources(category: keyof CategorySources): AlternateSource[] {
    if (!this.initialized) {
      this.initialize();
    }
    return this.registry[category] || [];
  }

  /**
   * Get primary source for category
   */
  getPrimarySource(category: keyof CategorySources): AlternateSource | null {
    const sources = this.getSources(category);
    return sources.find(s => s.type === 'primary') || sources[0] || null;
  }

  /**
   * Get fallback sources for category
   */
  getFallbackSources(category: keyof CategorySources): AlternateSource[] {
    const sources = this.getSources(category);
    return sources.filter(s => s.type === 'fallback');
  }

  /**
   * Get all sources
   */
  getAllSources(): CategorySources {
    if (!this.initialized) {
      this.initialize();
    }
    return { ...this.registry };
  }

  /**
   * Get registry statistics
   */
  getStats(): Record<string, number> {
    if (!this.initialized) {
      this.initialize();
    }

    return {
      market: this.registry.market.length,
      news: this.registry.news.length,
      sentiment: this.registry.sentiment.length,
      blockchain: this.registry.blockchain.length,
      whale: this.registry.whale.length,
      onchain: this.registry.onchain.length,
      total: Object.values(this.registry).reduce((sum, arr) => sum + arr.length, 0)
    };
  }
}
