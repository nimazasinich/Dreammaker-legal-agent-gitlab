/**
 * API Health Checker & Validator
 *
 * Validates and tests all configured API endpoints to ensure they are working
 * Provides comprehensive health reports and recommendations
 */

import { Logger } from '../core/Logger.js';
import { CentralizedAPIConfig, APIConfig, APICategory } from '../config/CentralizedAPIConfig.js';
import axios from 'axios';

export interface APITestResult {
  provider: string;
  category: string;
  status: 'success' | 'failed' | 'rate_limited' | 'unauthorized' | 'timeout';
  responseTime: number;
  error?: string;
  tested: Date;
  recommendation?: string;
}

export interface HealthReport {
  timestamp: Date;
  totalAPIs: number;
  successfulAPIs: number;
  failedAPIs: number;
  successRate: number;
  results: APITestResult[];
  recommendations: string[];
  summary: {
    byCategory: Record<string, { total: number; successful: number; failed: number }>;
    byStatus: Record<string, number>;
  };
}

/**
 * API Health Checker
 */
export class APIHealthChecker {
  private static instance: APIHealthChecker;
  private logger = Logger.getInstance();

  private constructor() {}

  static getInstance(): APIHealthChecker {
    if (!APIHealthChecker.instance) {
      APIHealthChecker.instance = new APIHealthChecker();
    }
    return APIHealthChecker.instance;
  }

  /**
   * Test all configured APIs
   */
  async checkAllAPIs(): Promise<HealthReport> {
    const startTime = Date.now();
    this.logger.info('Starting comprehensive API health check...');

    const results: APITestResult[] = [];

    // Test Market Data APIs
    this.logger.info('Testing Market Data APIs...');
    results.push(...await this.testCategory('marketData', CentralizedAPIConfig.marketData));

    // Test News APIs
    this.logger.info('Testing News APIs...');
    results.push(...await this.testCategory('news', CentralizedAPIConfig.news));

    // Test Sentiment APIs
    this.logger.info('Testing Sentiment APIs...');
    results.push(...await this.testCategory('sentiment', CentralizedAPIConfig.sentiment));

    // Test Whale Tracking APIs
    this.logger.info('Testing Whale Tracking APIs...');
    results.push(...await this.testCategory('whaleTracking', CentralizedAPIConfig.whaleTracking));

    // Test Block Explorers
    this.logger.info('Testing Block Explorer APIs...');
    results.push(...await this.testCategory('ethereum', CentralizedAPIConfig.blockExplorers.ethereum));
    results.push(...await this.testCategory('bsc', CentralizedAPIConfig.blockExplorers.bsc));
    results.push(...await this.testCategory('tron', CentralizedAPIConfig.blockExplorers.tron));

    // Generate report
    const report = this.generateReport(results);

    const elapsed = Date.now() - startTime;
    this.logger.info('API health check completed', {
      duration: elapsed,
      totalAPIs: report.totalAPIs,
      successRate: report.successRate.toFixed(2) + '%'
    });

    return report;
  }

  /**
   * Test APIs in a specific category
   */
  private async testCategory(category: string, config: APICategory): Promise<APITestResult[]> {
    const results: APITestResult[] = [];

    // Test primary
    if (config.primary) {
      const result = await this.testProvider(category, config.primary);
      results.push(result);
    }

    // Test fallbacks
    if (config.fallbacks) {
      for (const fallback of config.fallbacks) {
        const result = await this.testProvider(category, fallback);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Test a single provider
   */
  private async testProvider(category: string, config: APIConfig): Promise<APITestResult> {
    const startTime = Date.now();

    // Build test URL based on category
    const testEndpoint = this.getTestEndpoint(category, config);

    if (!testEndpoint) {
      return {
        provider: config.name,
        category,
        status: 'failed',
        responseTime: 0,
        error: 'No test endpoint configured',
        tested: new Date()
      };
    }

    try {
      const axiosConfig: any = {
        timeout: config.timeout || 10000,
        headers: {
          'Accept': 'application/json'
        }
      };

      // Add API key if needed
      if (config.headerKey && config.key) {
        axiosConfig.headers[config.headerKey] = config.key;
      }

      const response = await axios.get(testEndpoint, axiosConfig);
      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        return {
          provider: config.name,
          category,
          status: 'success',
          responseTime,
          tested: new Date(),
          recommendation: responseTime > 5000 ? 'Consider using a faster provider' : undefined
        };
      } else {
        return {
          provider: config.name,
          category,
          status: 'failed',
          responseTime,
          error: `HTTP ${response.status}`,
          tested: new Date()
        };
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // Determine error type
      let status: APITestResult['status'] = 'failed';
      let errorMsg = error.message;
      let recommendation: string | undefined;

      if (error.response) {
        switch (error.response.status) {
          case 401:
          case 403:
            status = 'unauthorized';
            errorMsg = 'API key invalid or missing';
            recommendation = 'Check API key configuration in .env';
            break;
          case 429:
            status = 'rate_limited';
            errorMsg = 'Rate limit exceeded';
            recommendation = 'Use fallback providers or increase cache TTL';
            break;
          case 504:
            status = 'timeout';
            errorMsg = 'Gateway timeout';
            recommendation = 'Provider may be experiencing issues';
            break;
          default:
            errorMsg = `HTTP ${error.response.status}`;
        }
      } else if (error.code === 'ECONNABORTED') {
        status = 'timeout';
        errorMsg = 'Request timeout';
        recommendation = 'Increase timeout or use faster provider';
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMsg = 'Provider unreachable';
        recommendation = 'Check internet connection or use alternative provider';
      }

      return {
        provider: config.name,
        category,
        status,
        responseTime,
        error: errorMsg,
        tested: new Date(),
        recommendation
      };
    }
  }

  /**
   * Get test endpoint for a category
   */
  private getTestEndpoint(category: string, config: APIConfig): string | null {
    const baseUrl = config.baseUrl;

    switch (category) {
      case 'marketData':
        if (config.name === 'coingecko') {
          return `${baseUrl}/simple/price?ids=bitcoin&vs_currencies=usd`;
        } else if (config.name === 'binance') {
          return `${baseUrl}/ticker/price?symbol=BTCUSDT`;
        } else if (config.name === 'coincap') {
          return `${baseUrl}/assets/bitcoin`;
        } else if (config.name === 'coinpaprika') {
          return `${baseUrl}/tickers/btc-bitcoin`;
        } else if (config.name === 'coinmarketcap' || config.name === 'coinmarketcap_2') {
          return `${baseUrl}/cryptocurrency/quotes/latest?symbol=BTC`;
        }
        break;

      case 'news':
        if (config.name === 'cryptopanic') {
          return `${baseUrl}/posts/?public=true`;
        } else if (config.name === 'reddit') {
          return `${baseUrl}/hot.json?limit=1`;
        }
        break;

      case 'sentiment':
        if (config.name === 'alternative_me') {
          return `${baseUrl}/?limit=1`;
        }
        break;

      case 'whaleTracking':
        if (config.name === 'clankapp') {
          return `${baseUrl}/whales/recent`;
        }
        break;

      case 'ethereum':
        if (config.name === 'etherscan' || config.name === 'etherscan_2') {
          return `${baseUrl}?module=stats&action=ethprice&apikey=${config.key || ''}`;
        }
        break;

      case 'bsc':
        if (config.name === 'bscscan') {
          return `${baseUrl}?module=stats&action=bnbprice&apikey=${config.key || ''}`;
        }
        break;

      case 'tron':
        if (config.name === 'tronscan') {
          return `${baseUrl}/system/status`;
        }
        break;
    }

    return null;
  }

  /**
   * Generate comprehensive health report
   */
  private generateReport(results: APITestResult[]): HealthReport {
    const byCategory: Record<string, { total: number; successful: number; failed: number }> = {};
    const byStatus: Record<string, number> = {
      success: 0,
      failed: 0,
      rate_limited: 0,
      unauthorized: 0,
      timeout: 0
    };

    const recommendations: string[] = [];

    // Process results
    results.forEach(result => {
      // By category
      if (!byCategory[result.category]) {
        byCategory[result.category] = { total: 0, successful: 0, failed: 0 };
      }
      byCategory[result.category].total++;
      if (result.status === 'success') {
        byCategory[result.category].successful++;
      } else {
        byCategory[result.category].failed++;
      }

      // By status
      byStatus[result.status]++;

      // Collect recommendations
      if (result.recommendation) {
        recommendations.push(`${result.provider}: ${result.recommendation}`);
      }
    });

    const successfulAPIs = byStatus.success;
    const totalAPIs = results.length;
    const failedAPIs = totalAPIs - successfulAPIs;

    // Add general recommendations
    if (successfulAPIs === 0) {
      recommendations.push('⚠️ CRITICAL: No APIs are working. Check internet connection and API keys.');
    } else if (successfulAPIs < totalAPIs * 0.5) {
      recommendations.push('⚠️ WARNING: Less than 50% of APIs are working. Consider updating API keys.');
    }

    if (byStatus.rate_limited > 0) {
      recommendations.push(`💡 ${byStatus.rate_limited} APIs are rate limited. Consider increasing cache TTL or using premium tiers.`);
    }

    if (byStatus.unauthorized > 0) {
      recommendations.push(`🔑 ${byStatus.unauthorized} APIs have authentication issues. Update API keys in .env file.`);
    }

    return {
      timestamp: new Date(),
      totalAPIs,
      successfulAPIs,
      failedAPIs,
      successRate: (successfulAPIs / totalAPIs) * 100,
      results,
      recommendations,
      summary: {
        byCategory,
        byStatus
      }
    };
  }

  /**
   * Print health report to console
   */
  printReport(report: HealthReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 API HEALTH REPORT');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${report.timestamp.toISOString()}`);
    console.log(`Total APIs Tested: ${report.totalAPIs}`);
    console.log(`✅ Successful: ${report.successfulAPIs}`);
    console.log(`❌ Failed: ${report.failedAPIs}`);
    console.log(`Success Rate: ${report.successRate.toFixed(2)}%`);
    console.log('');

    // By category
    console.log('📁 By Category:');
    Object.entries(report.summary.byCategory).forEach(([category, stats]) => {
      const rate = (stats.successful / stats.total) * 100;
      console.log(`  ${category}: ${stats.successful}/${stats.total} (${rate.toFixed(0)}%)`);
    });
    console.log('');

    // By status
    console.log('📈 By Status:');
    Object.entries(report.summary.byStatus).forEach(([status, count]) => {
      if (count > 0) {
        console.log(`  ${status}: ${count}`);
      }
    });
    console.log('');

    // Failed APIs
    const failed = report?.results?.filter(r => r.status !== 'success');
    if ((failed?.length || 0) > 0) {
      console.log('❌ Failed APIs:');
      failed.forEach(result => {
        console.log(`  • ${result.provider} (${result.category}): ${result.error} [${result.status}]`);
      });
      console.log('');
    }

    // Recommendations
    if ((report.recommendations?.length || 0) > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
      console.log('');
    }

    console.log('='.repeat(80) + '\n');
  }

  /**
   * Quick test of essential APIs only
   */
  async quickCheck(): Promise<{ marketData: boolean; sentiment: boolean; news: boolean }> {
    const results = {
      marketData: false,
      sentiment: false,
      news: false
    };

    // Test CoinGecko (market data)
    try {
      const priceResult = await this.testProvider('marketData', CentralizedAPIConfig.marketData.primary);
      results.marketData = priceResult.status === 'success';
    } catch (error) {
      this.logger.warn('Market data quick check failed', {}, error as Error);
    }

    // Test Alternative.me (sentiment)
    try {
      const sentimentResult = await this.testProvider('sentiment', CentralizedAPIConfig.sentiment.primary);
      results.sentiment = sentimentResult.status === 'success';
    } catch (error) {
      this.logger.warn('Sentiment quick check failed', {}, error as Error);
    }

    // Test CryptoPanic (news)
    try {
      const newsResult = await this.testProvider('news', CentralizedAPIConfig.news.primary);
      results.news = newsResult.status === 'success';
    } catch (error) {
      this.logger.warn('News quick check failed', {}, error as Error);
    }

    return results;
  }
}
