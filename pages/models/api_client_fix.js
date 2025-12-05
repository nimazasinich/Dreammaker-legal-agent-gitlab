/**
 * API Client Error Handling Fix
 * Add this to your api-client.js file
 */

class APIClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.errors = [];
  }

  /**
   * Fixed error handling with proper null checks
   */
  _getFallbackData(error) {
    // Ensure error is an object
    const safeError = error || {};
    
    return {
      data: [],
      success: false,
      error: true,
      message: safeError.message || 'Failed to fetch data',
      timestamp: Date.now(),
      details: {
        name: safeError.name || 'Error',
        stack: safeError.stack || 'No stack trace available'
      }
    };
  }

  /**
   * Fixed error logging with proper null checks
   */
  _logError(endpoint, method, error, duration = 0) {
    const errorLog = {
      endpoint: endpoint || 'unknown',
      method: method || 'GET',
      message: error?.message || 'Unknown error',
      duration: duration,
      timestamp: new Date().toISOString()
    };
    
    this.errors.push(errorLog);
    console.error('[APIClient] Error logged:', errorLog);
    
    // Keep only last 50 errors
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }
  }

  /**
   * Fixed request method with comprehensive error handling
   */
  async request(endpoint, options = {}) {
    const startTime = Date.now();
    const method = options.method || 'GET';
    
    try {
      const url = endpoint.startsWith('http') 
        ? endpoint 
        : `${this.baseURL}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error message');
        const error = new Error(`HTTP ${response.status}: ${errorText}`);
        error.status = response.status;
        error.statusText = response.statusText;
        
        this._logError(endpoint, method, error, duration);
        
        // Return fallback data instead of throwing
        return this._getFallbackData(error);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Handle different error types
      const safeError = error || new Error('Unknown error');
      
      if (safeError.name === 'AbortError') {
        safeError.message = 'Request timeout';
      } else if (!safeError.message) {
        safeError.message = 'Network error or invalid response';
      }
      
      this._logError(endpoint, method, safeError, duration);
      
      // Return fallback data instead of throwing
      return this._getFallbackData(safeError);
    }
  }

  /**
   * GET request wrapper
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request wrapper
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT request wrapper
   */
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE request wrapper
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Get error history
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Clear error history
   */
  clearErrors() {
    this.errors = [];
  }
}

// Export singleton instance
export const api = new APIClient('/api');
export default api;
