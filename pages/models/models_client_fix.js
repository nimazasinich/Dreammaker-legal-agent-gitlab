/**
 * Models Client with Fixed Error Handling
 * Replace your models-client.js with this
 */

import { api } from './api-client.js';
import logger from '../utils/logger.js';

class ModelsClient {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute
  }

  /**
   * Get models summary with comprehensive error handling
   */
  async getModelsSummary() {
    const cacheKey = 'models_summary';
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if available and fresh
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.debug('ModelsClient', 'Returning cached models summary');
      return cached.data;
    }

    try {
      logger.debug('ModelsClient', 'Fetching models summary...');
      
      // Try the endpoint
      const response = await fetch('/api/models/summary', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      }).catch(err => {
        logger.warn('ModelsClient', 'Fetch failed:', err?.message || 'Unknown error');
        return null;
      });

      if (!response || !response.ok) {
        const statusText = response?.statusText || 'No response';
        logger.warn('ModelsClient', `API returned error: ${statusText}`);
        
        // Return empty but valid structure
        return {
          success: false,
          error: true,
          message: `Failed to fetch models: ${statusText}`,
          categories: {},
          models: [],
          summary: {
            total_models: 0,
            loaded_models: 0,
            failed_models: 0,
            hf_mode: 'unavailable',
            transformers_available: false
          }
        };
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        logger.error('ModelsClient', 'Invalid content type:', contentType);
        throw new Error('Invalid response content type');
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        logger.error('ModelsClient', 'Invalid response data');
        throw new Error('Invalid response data structure');
      }

      // Cache successful response
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      logger.info('ModelsClient', 'Successfully fetched models summary');
      return data;

    } catch (error) {
      const safeError = error || new Error('Unknown error');
      logger.error('ModelsClient', 'Failed to get models summary:', safeError.message);
      logger.error('ModelsClient', 'Error details:', {
        message: safeError.message,
        stack: safeError.stack,
        name: safeError.name
      });

      // Return a valid empty structure instead of throwing
      return {
        success: false,
        error: true,
        message: safeError.message || 'Failed to fetch models',
        categories: {},
        models: [],
        summary: {
          total_models: 0,
          loaded_models: 0,
          failed_models: 0,
          hf_mode: 'error',
          hf_status: safeError.message || 'Unknown error',
          transformers_available: false
        }
      };
    }
  }

  /**
   * Get list of all models
   */
  async getModelsList() {
    try {
      const response = await fetch('/api/models/list', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      logger.error('ModelsClient', 'Failed to get models list:', error?.message || 'Unknown error');
      return {
        success: false,
        error: true,
        message: error?.message || 'Failed to fetch models list',
        models: []
      };
    }
  }

  /**
   * Get status of a specific model
   */
  async getModelStatus(modelId) {
    if (!modelId) {
      return {
        success: false,
        error: true,
        message: 'Model ID is required'
      };
    }

    try {
      const response = await fetch(`/api/models/${encodeURIComponent(modelId)}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      logger.error('ModelsClient', `Failed to get status for ${modelId}:`, error?.message || 'Unknown error');
      return {
        success: false,
        error: true,
        message: error?.message || 'Failed to fetch model status',
        model_id: modelId,
        status: 'unknown'
      };
    }
  }

  /**
   * Initialize or reinitialize models
   */
  async initializeModels() {
    try {
      const response = await fetch('/api/models/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Clear cache on successful init
      this.cache.clear();
      
      return data;

    } catch (error) {
      logger.error('ModelsClient', 'Failed to initialize models:', error?.message || 'Unknown error');
      return {
        success: false,
        error: true,
        message: error?.message || 'Failed to initialize models'
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.debug('ModelsClient', 'Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      timeout: this.cacheTimeout
    };
  }
}

// Export singleton instance
export const modelsClient = new ModelsClient();
export default modelsClient;
