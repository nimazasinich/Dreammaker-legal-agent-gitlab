/**
 * API Integration Guards
 * 
 * Provides utilities for validating API responses, checking integration availability,
 * and returning deterministic labeled fallback states.
 * 
 * RULE: NO MOCK DATA IN UI
 * - If real data is unavailable, return a labeled state
 * - Never fabricate business data to fill gaps
 * - Always log unavailability for monitoring
 */

import { Logger } from '../core/Logger';

const logger = Logger.getInstance();

/**
 * Standard API Response Envelope
 */
export interface ApiEnvelope<T = any> {
  status: 'ok' | 'error';
  code?: string;
  message?: string;
  data?: T;
}

/**
 * Deterministic fallback state codes
 */
export enum FallbackCode {
  DISABLED_BY_CONFIG = 'DISABLED_BY_CONFIG',
  AI_DATA_TOO_SMALL = 'AI_DATA_TOO_SMALL',
  KUCOIN_UNAVAILABLE = 'KUCOIN_UNAVAILABLE',
  BINANCE_UNAVAILABLE = 'BINANCE_UNAVAILABLE',
  DATA_UNAVAILABLE = 'DATA_UNAVAILABLE',
  INTEGRATION_NOT_CONFIGURED = 'INTEGRATION_NOT_CONFIGURED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  BACKEND_OFFLINE = 'BACKEND_OFFLINE',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * Fallback state structure
 */
export interface FallbackState {
  code: FallbackCode;
  message: string;
  hint?: string;
  timestamp: number;
}

/**
 * Check if response follows the envelope pattern
 */
export function isValidEnvelope(response: any): response is ApiEnvelope {
  if (!response || typeof response !== 'object') {
    return false;
  }
  
  if (!('status' in response)) {
    return false;
  }
  
  if (response.status !== 'ok' && response.status !== 'error') {
    return false;
  }
  
  return true;
}

/**
 * Validate API response envelope and extract data
 * Returns data on success, throws on error
 */
export function validateEnvelope<T>(response: any, source: string): T {
  if (!isValidEnvelope(response)) {
    logger.error('Invalid response envelope', { source, response });
    throw new Error(`Invalid response envelope from ${source}`);
  }
  
  if (response.status === 'error') {
    logger.error('API error response', { source, code: response.code, message: response.message });
    throw new Error(response.message || `API error from ${source}`);
  }
  
  return response.data as T;
}

/**
 * Create a fallback state object
 */
export function createFallbackState(
  code: FallbackCode,
  message: string,
  hint?: string
): FallbackState {
  const state: FallbackState = {
    code,
    message,
    timestamp: Date.now(),
  };
  
  if (hint) {
    state.hint = hint;
  }
  
  // Log fallback state for monitoring
  logger.warn('Fallback state created', {
    component: 'apiGuards',
    severity: 'warning',
    code,
    message,
    hint,
    metadata: { timestamp: state.timestamp }
  });
  
  return state;
}

/**
 * Check if configuration exists for a service
 */
export function checkConfigExists(service: string): boolean {
  const env = import.meta.env;
  
  switch (service.toLowerCase()) {
    case 'kucoin':
      return !!(env.VITE_KUCOIN_API_KEY || env.KUCOIN_API_KEY);
    
    case 'binance':
      return !!(env.VITE_BINANCE_API_KEY || env.BINANCE_API_KEY);
    
    case 'huggingface':
      return !!(env.VITE_HF_TOKEN || env.HF_TOKEN);
    
    case 'backend':
      return !!(env.VITE_BACKEND_PORT || env.VITE_API_BASE);
    
    default:
      return false;
  }
}

/**
 * Check service health
 */
export async function checkServiceHealth(
  service: string,
  endpoint: string
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    return response.ok;
  } catch (error) {
    logger.warn(`Service health check failed: ${service}`, { endpoint }, error as Error);
    return false;
  }
}

/**
 * Fetch with envelope validation
 * Returns data on success, fallback state on failure
 */
export async function fetchWithGuard<T>(
  url: string,
  options: RequestInit = {},
  source: string
): Promise<{ success: true; data: T } | { success: false; fallback: FallbackState }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          fallback: createFallbackState(
            FallbackCode.DATA_UNAVAILABLE,
            `Endpoint not found: ${url}`,
            'Ensure the backend service is running and the endpoint is correct'
          ),
        };
      }
      
      if (response.status === 503) {
        return {
          success: false,
          fallback: createFallbackState(
            FallbackCode.BACKEND_OFFLINE,
            'Backend service is unavailable',
            'Check if the backend server is running'
          ),
        };
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const json = await response.json();
    const data = validateEnvelope<T>(json, source);
    
    return { success: true, data };
  } catch (error) {
    logger.error(`Fetch failed: ${source}`, { url }, error as Error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        fallback: createFallbackState(
          FallbackCode.NETWORK_ERROR,
          'Network connection failed',
          'Check your internet connection and backend service status'
        ),
      };
    }
    
    return {
      success: false,
      fallback: createFallbackState(
        FallbackCode.DATA_UNAVAILABLE,
        error instanceof Error ? error.message : 'Unknown error',
        'Check logs for details'
      ),
    };
  }
}

/**
 * Check if a value is a fallback state
 */
export function isFallbackState(value: any): value is FallbackState {
  return (
    value &&
    typeof value === 'object' &&
    'code' in value &&
    'message' in value &&
    'timestamp' in value &&
    Object.values(FallbackCode).includes(value.code)
  );
}

/**
 * Get user-friendly message for fallback code
 */
export function getFallbackMessage(fallback: FallbackState): string {
  const messages: Record<FallbackCode, string> = {
    [FallbackCode.DISABLED_BY_CONFIG]: 'This feature is disabled in configuration',
    [FallbackCode.AI_DATA_TOO_SMALL]: 'Insufficient data for AI analysis',
    [FallbackCode.KUCOIN_UNAVAILABLE]: 'KuCoin integration is unavailable',
    [FallbackCode.BINANCE_UNAVAILABLE]: 'Binance integration is unavailable',
    [FallbackCode.DATA_UNAVAILABLE]: 'Data is currently unavailable',
    [FallbackCode.INTEGRATION_NOT_CONFIGURED]: 'Integration not configured',
    [FallbackCode.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions',
    [FallbackCode.BACKEND_OFFLINE]: 'Backend service is offline',
    [FallbackCode.NETWORK_ERROR]: 'Network connection error',
  };
  
  return messages[fallback.code] || fallback.message;
}
