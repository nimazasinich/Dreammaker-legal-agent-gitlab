/**
 * Standard Response Middleware
 * 
 * Ensures all API responses follow the standard envelope format:
 * { status: "ok"|"error", code?: string, message?: string, data?: any }
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

// Extend Express Response type to include our helper methods
declare global {
  namespace Express {
    interface Response {
      success(data?: any, message?: string): Response;
      error(code: string, message: string, statusCode?: number, data?: any): Response;
    }
  }
}

/**
 * Standard success response format
 */
function success(res: Response, data?: any, message?: string): Response {
  const response = {
    status: 'ok' as const,
    message: message || 'Success',
    data: data || null
  };

  return res.json(response);
}

/**
 * Standard error response format
 */
function error(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 500,
  data?: any
): Response {
  const response: any = {
    status: 'error' as const,
    code,
    message
  };

  if (data !== undefined) {
    response.data = data;
  }

  // Log error for monitoring
  logger.error(`API Error: ${code}`, {
    statusCode,
    message,
    endpoint: res.req?.originalUrl,
    method: res.req?.method
  });

  return res.status(statusCode).json(response);
}

/**
 * Middleware to attach helper methods to response object
 */
export function standardResponseMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Attach success helper
  res.success = function(data?: any, message?: string): Response {
    return success(this, data, message);
  };

  // Attach error helper
  res.error = function(
    code: string,
    message: string,
    statusCode?: number,
    data?: any
  ): Response {
    return error(this, code, message, statusCode, data);
  };

  next();
}

/**
 * Error handler middleware that ensures all errors return standard format
 */
export function errorHandlerMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If response already sent, delegate to default error handler
  if (res.headersSent) {
    return next(err);
  }

  // Determine error code and status
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const statusCode = err.statusCode || err.status || 500;

  // Log structured error
  logger.error(`Unhandled Error: ${code}`, {
    statusCode,
    message,
    endpoint: req.originalUrl,
    method: req.method,
    stack: err.stack
  }, err);

  // Send standard error response
  res.status(statusCode).json({
    status: 'error',
    code,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * 404 handler that returns standard format
 */
export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
}
