// Structured error response utility for consistent API error handling
import { Response } from 'express';
import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

export type ErrorProvider =
  | 'binance'
  | 'kucoin'
  | 'kucoin_sandbox'
  | 'hf_ohlcv'
  | 'coingecko'
  | 'coinmarketcap'
  | 'cryptocompare'
  | 'newsapi'
  | 'huggingface'
  | 'internal'
  | 'unknown';

export type ErrorReason =
  | 'UPSTREAM_UNAVAILABLE'
  | 'DATA_INVALID'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR'
  | 'PROVIDER_DOWN'
  | 'UNKNOWN_ERROR';

export interface StructuredErrorResponse {
  ok: false;
  provider: ErrorProvider;
  reason: ErrorReason;
  message: string;
  details?: Record<string, any>;
}

/**
 * Send a structured error response to the client
 */
export function sendStructuredError(
  res: Response,
  statusCode: number,
  provider: ErrorProvider,
  reason: ErrorReason,
  message: string,
  details?: Record<string, any>,
  error?: Error | unknown
): void {
  const response: StructuredErrorResponse = {
    ok: false,
    provider,
    reason,
    message,
    ...(details && { details })
  };

  // Log the error for observability
  logger.error(`[${provider}] ${reason}: ${message}`, details || {}, error as Error);

  res.status(statusCode).json(response);
}

/**
 * Determine appropriate HTTP status code based on error reason
 */
export function getStatusCodeForReason(reason: ErrorReason): number {
  switch (reason) {
    case 'NOT_FOUND':
      return 404;
    case 'RATE_LIMITED':
      return 429;
    case 'TIMEOUT':
    case 'UPSTREAM_UNAVAILABLE':
    case 'PROVIDER_DOWN':
    case 'NETWORK_ERROR':
      return 503;
    case 'DATA_INVALID':
    case 'PARSE_ERROR':
      return 502;
    default:
      return 500;
  }
}

/**
 * Determine error reason from error object
 */
export function inferErrorReason(error: any): ErrorReason {
  if (!error) return 'UNKNOWN_ERROR';

  const message = error.message || String(error);
  const statusCode = error.statusCode || error.status || error.response?.status;

  // Check status codes first
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 429) return 'RATE_LIMITED';
  if (statusCode >= 500) return 'UPSTREAM_UNAVAILABLE';

  // Check error messages
  if (
    message.includes('ENOTFOUND') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    message.includes('fetch failed') ||
    message.includes('network')
  ) {
    return 'NETWORK_ERROR';
  }

  if (message.includes('timeout') || error.name === 'AbortError') {
    return 'TIMEOUT';
  }

  if (
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return 'RATE_LIMITED';
  }

  if (
    message.includes('parse') ||
    message.includes('JSON') ||
    message.includes('invalid')
  ) {
    return 'PARSE_ERROR';
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Handle error and send structured response
 * Automatically infers reason and status code from error
 */
export function handleErrorAndRespond(
  res: Response,
  provider: ErrorProvider,
  error: any,
  customMessage?: string,
  details?: Record<string, any>
): void {
  const reason = inferErrorReason(error);
  const statusCode = getStatusCodeForReason(reason);
  const message = customMessage || error.message || 'An unexpected error occurred';

  sendStructuredError(res, statusCode, provider, reason, message, details, error);
}
