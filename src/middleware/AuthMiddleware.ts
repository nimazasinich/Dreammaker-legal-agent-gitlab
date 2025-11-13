/**
 * Authentication Middleware
 *
 * Provides configurable authentication for API endpoints
 * Supports API Key and JWT authentication modes
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '../core/Logger';
import { getSecurityConfig } from '../config/securityConfig';
import { sendError, ErrorResponses } from '../utils/httpError';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string;
        email?: string;
        role?: string;
        [key: string]: unknown;
      };
    }
  }
}

export class AuthMiddleware {
  private static instance: AuthMiddleware;
  private logger = Logger.getInstance();

  private constructor() {}

  public static getInstance(): AuthMiddleware {
    if (!AuthMiddleware.instance) {
      AuthMiddleware.instance = new AuthMiddleware();
    }
    return AuthMiddleware.instance;
  }

  /**
   * Main authentication middleware
   */
  public authenticate() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const config = getSecurityConfig();

        // Skip if auth is disabled
        if (!config.auth.enabled) {
          return next();
        }

        // Check if path should bypass auth
        if (this.shouldBypass(req.path, config.auth.bypassPaths)) {
          return next();
        }

        // Perform authentication based on mode
        if (config.auth.mode === 'apiKey') {
          await this.authenticateApiKey(req, res, next, config);
        } else if (config.auth.mode === 'jwt') {
          await this.authenticateJWT(req, res, next, config);
        } else {
          // Unknown mode - fail closed
          sendError(res, ErrorResponses.authRequired(), 'Unknown auth mode');
        }
      } catch (error) {
        this.logger.error('Authentication error', {}, error as Error);
        sendError(res, ErrorResponses.internalError('Authentication failed'));
      }
    };
  }

  /**
   * API Key authentication
   */
  private async authenticateApiKey(
    req: Request,
    res: Response,
    next: NextFunction,
    config: ReturnType<typeof getSecurityConfig>
  ): Promise<void> {
    const apiKeyHeader = config.auth.apiKeyHeader;
    const providedKey = req.headers[apiKeyHeader.toLowerCase()] as string;

    // Get expected API key from environment
    const expectedKey = process.env.BOLT_API_KEY || process.env.API_KEY;

    if (!expectedKey) {
      this.logger.warn('API key authentication enabled but BOLT_API_KEY not set in environment');
      return sendError(
        res,
        ErrorResponses.authRequired(),
        'API key auth enabled but server key not configured'
      );
    }

    if (!providedKey) {
      if (config.logging.logAuthFailures) {
        this.logger.warn('API key missing', {
          path: req.path,
          ip: req.ip,
          method: req.method
        });
      }
      return sendError(res, ErrorResponses.invalidApiKey());
    }

    // Constant-time comparison to prevent timing attacks
    if (!this.constantTimeCompare(providedKey, expectedKey)) {
      if (config.logging.logAuthFailures) {
        this.logger.warn('Invalid API key', {
          path: req.path,
          ip: req.ip,
          method: req.method
        });
      }
      return sendError(res, ErrorResponses.invalidApiKey());
    }

    // Success - attach minimal user info
    req.user = {
      id: 'api-key-user',
      role: 'api-key'
    };

    next();
  }

  /**
   * JWT authentication
   */
  private async authenticateJWT(
    req: Request,
    res: Response,
    next: NextFunction,
    config: ReturnType<typeof getSecurityConfig>
  ): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (config.logging.logAuthFailures) {
        this.logger.warn('JWT token missing', {
          path: req.path,
          ip: req.ip,
          method: req.method
        });
      }
      return sendError(res, ErrorResponses.invalidToken());
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, config.auth.jwtSecret) as Record<string, unknown>;

      // Attach user info from token
      req.user = {
        id: decoded.sub as string,
        email: decoded.email as string,
        role: decoded.role as string,
        ...decoded
      };

      next();
    } catch (error) {
      if (config.logging.logAuthFailures) {
        this.logger.warn('Invalid JWT token', {
          path: req.path,
          ip: req.ip,
          method: req.method,
          error: (error as Error).message
        });
      }

      if ((error as Error).name === 'TokenExpiredError') {
        return sendError(res, ErrorResponses.invalidToken());
      }

      return sendError(res, ErrorResponses.invalidToken());
    }
  }

  /**
   * Check if path should bypass authentication
   */
  private shouldBypass(path: string, bypassPaths: string[]): boolean {
    return bypassPaths.some(bypassPath => {
      // Exact match
      if (path === bypassPath) {
        return true;
      }

      // Wildcard match (e.g., /api/health/*)
      if (bypassPath.endsWith('*')) {
        const prefix = bypassPath.slice(0, -1);
        return path.startsWith(prefix);
      }

      return false;
    });
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Generate JWT token (utility for development/testing)
   */
  public static generateToken(
    payload: Record<string, unknown>,
    expiresIn?: string
  ): string {
    const config = getSecurityConfig();
    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: expiresIn || config.auth.jwtExpiresIn
    });
  }
}

// Export singleton instance
export const authMiddleware = AuthMiddleware.getInstance();
