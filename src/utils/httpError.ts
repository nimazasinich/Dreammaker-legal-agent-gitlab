/**
 * HTTP Error Utilities
 *
 * Standardized error handling for API responses
 * Provides consistent error structure across all endpoints
 */

import { Response } from 'express';
import { Logger } from '../core/Logger';

/**
 * Standard API error response structure
 */
export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: unknown;
  timestamp?: number;
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_PARAMETER: 'INVALID_PARAMETER',

  // Server Errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Not Found
  NOT_FOUND: 'NOT_FOUND'
} as const;

/**
 * Create standardized error object
 */
export function createError(
  code: string,
  message: string,
  status: number,
  details?: unknown
): ApiError {
  return {
    code,
    message,
    status,
    details,
    timestamp: Date.now()
  };
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  error: ApiError,
  logMessage?: string
): void {
  const logger = Logger.getInstance();

  // Log the error (without sensitive data)
  if (logMessage) {
    logger.warn(logMessage, {
      code: error.code,
      status: error.status,
      // Only log sanitized details
      details: sanitizeForLogging(error.details)
    });
  }

  // Send response
  res.status(error.status).json({
    success: false,
    error: error.code,
    message: error.message,
    details: error.details,
    timestamp: error.timestamp
  });
}

/**
 * Sanitize data for logging (remove sensitive fields)
 */
function sanitizeForLogging(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data } as Record<string, unknown>;

  // Remove sensitive fields
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'api_key',
    'secret',
    'authorization',
    'jwt',
    'accessToken',
    'refreshToken'
  ];

  for (const key of sensitiveKeys) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Common error response helpers
 */
export const ErrorResponses = {
  authRequired: (): ApiError =>
    createError(
      ErrorCodes.AUTH_REQUIRED,
      'Authentication required',
      401
    ),

  invalidApiKey: (): ApiError =>
    createError(
      ErrorCodes.INVALID_API_KEY,
      'Invalid or missing API key',
      401
    ),

  invalidToken: (): ApiError =>
    createError(
      ErrorCodes.INVALID_TOKEN,
      'Invalid or expired token',
      401
    ),

  rateLimitExceeded: (retryAfter?: number): ApiError =>
    createError(
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded. Please try again later.',
      429,
      retryAfter ? { retryAfter } : undefined
    ),

  validationError: (field: string, error: string): ApiError =>
    createError(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid request payload',
      400,
      { field, error }
    ),

  invalidParameter: (parameter: string, reason: string): ApiError =>
    createError(
      ErrorCodes.INVALID_PARAMETER,
      `Invalid parameter: ${parameter}`,
      400,
      { parameter, reason }
    ),

  missingField: (field: string): ApiError =>
    createError(
      ErrorCodes.MISSING_REQUIRED_FIELD,
      `Missing required field: ${field}`,
      400,
      { field }
    ),

  internalError: (message?: string): ApiError =>
    createError(
      ErrorCodes.INTERNAL_ERROR,
      message || 'Internal server error',
      500
    ),

  notFound: (resource?: string): ApiError =>
    createError(
      ErrorCodes.NOT_FOUND,
      resource ? `${resource} not found` : 'Resource not found',
      404
    )
};
