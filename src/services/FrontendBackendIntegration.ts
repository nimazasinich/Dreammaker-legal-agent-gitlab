/**
 * FrontendBackendIntegration
 * Integration layer connecting frontend components to backend services
 * Ensures all frontend components can access backend functionality
 */

import { Logger } from '../core/Logger.js';
import { dataManager } from './dataManager.js';
import { TechnicalAnalysisService } from './TechnicalAnalysisService.js';
import { HistoricalDataService } from './HistoricalDataService.js';
import { CentralizedAPIManager } from './CentralizedAPIManager.js';
import { HealthCheckService } from '../monitoring/HealthCheckService.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor.js';

export class FrontendBackendIntegration {
  private static instance: FrontendBackendIntegration;
  private logger = Logger.getInstance();
  
  // Backend Services
  private technicalAnalysis = TechnicalAnalysisService.getInstance();
  private historicalData = new HistoricalDataService();
  private apiManager = CentralizedAPIManager.getInstance();
  private healthCheck = HealthCheckService.getInstance();
  private metricsCollector = MetricsCollector.getInstance();
  private performanceMonitor = PerformanceMonitor.getInstance();

  private constructor() {
    this.setupIntegration();
  }

  static getInstance(): FrontendBackendIntegration {
    if (!FrontendBackendIntegration.instance) {
      FrontendBackendIntegration.instance = new FrontendBackendIntegration();
    }
    return FrontendBackendIntegration.instance;
  }

  /**
   * Setup integration between frontend and backend
   */
  private setupIntegration(): void {
    try {
      // Extend dataManager with additional services
      this.extendDataManager();
      
      // Setup API endpoints for frontend access
      this.setupAPIExtensions();
      
      this.logger.info('Frontend-Backend integration initialized');
    } catch (error) {
      this.logger.error('Failed to setup frontend-backend integration', {}, error as Error);
    }
  }

  /**
   * Extend dataManager with additional services
   */
  private extendDataManager(): void {
    // Add technical analysis methods
    if (typeof (dataManager as any).calculateTechnicalIndicators === 'undefined') {
      (dataManager as any).calculateTechnicalIndicators = async (symbol: string, timeframe: string) => {
        try {
          const marketData = await dataManager.fetchData(`market-data/${symbol}?interval=${timeframe}&limit=200`);
          if (Array.isArray(marketData) && (marketData?.length || 0) > 0) {
            return this.technicalAnalysis.calculateAllIndicators(marketData);
          }
          return null;
        } catch (error) {
          this.logger.error('Failed to calculate technical indicators', { symbol }, error as Error);
          return null;
        }
      };
    }

    // Add historical data methods
    if (typeof (dataManager as any).getHistoricalData === 'undefined') {
      (dataManager as any).getHistoricalData = async (
        symbol: string,
        timeframe: string,
        limit: number = 1000
      ) => {
        try {
          return await this.historicalData.getHistoricalData(symbol, timeframe, limit);
        } catch (error) {
          this.logger.error('Failed to get historical data', { symbol }, error as Error);
          return [];
        }
      };
    }

    // Add centralized API methods
    if (typeof (dataManager as any).fetchFromAPI === 'undefined') {
      (dataManager as any).fetchFromAPI = async (
        endpoint: string,
        options?: any
      ) => {
        try {
          const response = await this.apiManager.request(endpoint, options);
          return response.data;
        } catch (error) {
          this.logger.error('Failed to fetch from API', { endpoint }, error as Error);
          return null;
        }
      };
    }

    // Add health check methods
    if (typeof (dataManager as any).getHealthStatus === 'undefined') {
      (dataManager as any).getHealthStatus = async () => {
        try {
          return await this.healthCheck.performHealthCheck();
        } catch (error) {
          this.logger.error('Failed to get health status', {}, error as Error);
          return null;
        }
      };
    }

    // Add metrics methods
    if (typeof (dataManager as any).getMetrics === 'undefined') {
      (dataManager as any).getMetrics = () => {
        return this.metricsCollector.getSummary();
      };
    }

    // Add performance monitoring methods
    if (typeof (dataManager as any).getPerformanceMetrics === 'undefined') {
      (dataManager as any).getPerformanceMetrics = () => {
        return this.performanceMonitor.collectMetrics();
      };
    }
  }

  /**
   * Setup API extensions for frontend
   */
  private setupAPIExtensions(): void {
    // These will be used by frontend components through dataManager
    this.logger.info('API extensions configured for frontend access');
  }

  /**
   * Get technical analysis for a symbol
   */
  async getTechnicalAnalysis(symbol: string, timeframe: string): Promise<any> {
    try {
      const marketData = await dataManager.fetchData(`market-data/${symbol}?interval=${timeframe}&limit=200`);
      if (Array.isArray(marketData) && (marketData?.length || 0) > 0) {
        return this.technicalAnalysis.calculateAllIndicators(marketData);
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to get technical analysis', { symbol }, error as Error);
      return null;
    }
  }

  /**
   * Get historical data for a symbol
   */
  async getHistoricalData(symbol: string, timeframe: string, limit: number = 1000): Promise<any[]> {
    try {
      return await this.historicalData.getHistoricalData(symbol, timeframe, limit);
    } catch (error) {
      this.logger.error('Failed to get historical data', { symbol }, error as Error);
      return [];
    }
  }

  /**
   * Fetch from centralized API
   */
  async fetchFromAPI(endpoint: string, options?: any): Promise<any> {
    try {
      const response = await this.apiManager.request(endpoint, options);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch from API', { endpoint }, error as Error);
      return null;
    }
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<any> {
    try {
      return await this.healthCheck.performHealthCheck();
    } catch (error) {
      this.logger.error('Failed to get health status', {}, error as Error);
      return null;
    }
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): any {
    return this.metricsCollector.getSummary();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): any {
    return this.performanceMonitor.collectMetrics();
  }
}

// Export singleton instance
export const frontendBackendIntegration = FrontendBackendIntegration.getInstance();

