/**
 * Rate Limit Middleware
 *
 * IP-based rate limiting with configurable windows and limits
 * Implements sliding window algorithm for accurate rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../core/Logger';
import { getSecurityConfig } from '../config/securityConfig';
import { sendError, ErrorResponses } from '../utils/httpError';

interface RateLimitEntry {
  requests: number[];  // Array of request timestamps
  resetTime: number;
}

export class RateLimitMiddleware {
  private static instance: RateLimitMiddleware;
  private logger = Logger.getInstance();
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  public static getInstance(): RateLimitMiddleware {
    if (!RateLimitMiddleware.instance) {
      RateLimitMiddleware.instance = new RateLimitMiddleware();
    }
    return RateLimitMiddleware.instance;
  }

  /**
   * Main rate limiting middleware
   */
  public limit() {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const config = getSecurityConfig();

        // Skip if rate limiting is disabled
        if (!config.rateLimit.enabled) {
          return next();
        }

        // Check if path should bypass rate limiting
        if (this.shouldBypass(req.path, config.rateLimit.bypassPaths)) {
          return next();
        }

        // Get client identifier (IP address)
        const clientId = this.getClientId(req);

        // Check rate limit
        const result = this.checkLimit(clientId, config);

        // Add rate limit headers if enabled
        if (config.rateLimit.headers.enabled) {
          res.setHeader(config.rateLimit.headers.total, config.rateLimit.maxRequests);
          res.setHeader(config.rateLimit.headers.remaining, Math.max(0, result.remaining));
          res.setHeader(config.rateLimit.headers.reset, result.resetTime);
        }

        if (!result.allowed) {
          if (config.logging.logRateLimitHits) {
            this.logger.warn('Rate limit exceeded', {
              ip: clientId,
              path: req.path,
              method: req.method,
              remaining: result.remaining,
              resetTime: new Date(result.resetTime).toISOString()
            });
          }

          const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
          res.setHeader('Retry-After', retryAfter);

          return sendError(
            res,
            ErrorResponses.rateLimitExceeded(retryAfter),
            `Rate limit exceeded for ${clientId}`
          );
        }

        next();
      } catch (error) {
        this.logger.error('Rate limit error', {}, error as Error);
        // On error, allow request to proceed (fail open for availability)
        next();
      }
    };
  }

  /**
   * Check if request is within rate limit
   */
  private checkLimit(
    clientId: string,
    config: ReturnType<typeof getSecurityConfig>
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowMs = config.rateLimit.windowMs;
    const maxRequests = config.rateLimit.maxRequests;

    // Get or create entry for this client
    let entry = this.store.get(clientId);

    if (!entry || now >= entry.resetTime) {
      // Create new window
      entry = {
        requests: [now],
        resetTime: now + windowMs
      };
      this.store.set(clientId, entry);

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: entry.resetTime
      };
    }

    // Filter out requests outside the current window (sliding window)
    const windowStart = now - windowMs;
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);

    // Add current request
    entry.requests.push(now);

    // Update reset time (sliding window)
    entry.resetTime = now + windowMs;

    const remaining = maxRequests - entry.requests.length;
    const allowed = entry.requests.length <= maxRequests;

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime
    };
  }

  /**
   * Get client identifier from request
   */
  private getClientId(req: Request): string {
    // Try to get real IP from headers (for proxy scenarios)
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback to req.ip
    return req.ip || 'unknown';
  }

  /**
   * Check if path should bypass rate limiting
   */
  private shouldBypass(path: string, bypassPaths: string[]): boolean {
    return bypassPaths.some(bypassPath => {
      if (path === bypassPath) {
        return true;
      }

      if (bypassPath.endsWith('*')) {
        const prefix = bypassPath.slice(0, -1);
        return path.startsWith(prefix);
      }

      return false;
    });
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    const config = getSecurityConfig();
    const maxAge = config.rateLimit.windowMs * 2; // Keep data for 2 windows

    for (const [clientId, entry] of this.store.entries()) {
      if (now - entry.resetTime > maxAge) {
        this.store.delete(clientId);
      }
    }

    this.logger.debug('Rate limit cleanup completed', {
      activeClients: this.store.size
    });
  }

  /**
   * Reset rate limit for a specific client (for testing/admin)
   */
  public resetClient(clientId: string): void {
    this.store.delete(clientId);
  }

  /**
   * Get current stats (for monitoring)
   */
  public getStats(): {
    activeClients: number;
    totalEntries: number;
  } {
    return {
      activeClients: this.store.size,
      totalEntries: Array.from(this.store.values()).reduce(
        (sum, entry) => sum + entry.requests.length,
        0
      )
    };
  }

  /**
   * Clear all rate limit data (for testing)
   */
  public clear(): void {
    this.store.clear();
  }

  /**
   * Shutdown cleanup
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Export singleton instance
export const rateLimitMiddleware = RateLimitMiddleware.getInstance();
