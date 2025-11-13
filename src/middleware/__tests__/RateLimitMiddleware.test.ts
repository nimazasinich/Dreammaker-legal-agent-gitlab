/**
 * RateLimitMiddleware Tests
 *
 * Tests for rate limiting middleware
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { RateLimitMiddleware } from '../RateLimitMiddleware';
import * as securityConfig from '../../config/securityConfig';

// Mock security config
vi.mock('../../config/securityConfig');

describe('RateLimitMiddleware', () => {
  let rateLimitMiddleware: RateLimitMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let setHeaderMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rateLimitMiddleware = RateLimitMiddleware.getInstance();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    setHeaderMock = vi.fn();

    mockRequest = {
      path: '/api/test',
      ip: '127.0.0.1',
      method: 'GET',
      headers: {}
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
      setHeader: setHeaderMock
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Reset the rate limiter for each test
    rateLimitMiddleware.resetClient('127.0.0.1');
  });

  describe('when rate limiting is disabled', () => {
    it('should allow all requests to proceed', () => {
      vi.mocked(securityConfig.getSecurityConfig).mockReturnValue({
        auth: {} as any,
        rateLimit: {
          enabled: false,
          windowMs: 60000,
          maxRequests: 60,
          bypassPaths: [],
          headers: {
            enabled: true,
            total: 'X-RateLimit-Limit',
            remaining: 'X-RateLimit-Remaining',
            reset: 'X-RateLimit-Reset'
          }
        },
        validation: {} as any,
        cors: {} as any,
        logging: {} as any
      });

      const middleware = rateLimitMiddleware.limit();

      // Make multiple requests - all should succeed
      for (let i = 0; i < 100; i++) {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(100);
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('when rate limiting is enabled', () => {
    beforeEach(() => {
      vi.mocked(securityConfig.getSecurityConfig).mockReturnValue({
        auth: {} as any,
        rateLimit: {
          enabled: true,
          windowMs: 60000,
          maxRequests: 5,
          bypassPaths: ['/health', '/status'],
          headers: {
            enabled: true,
            total: 'X-RateLimit-Limit',
            remaining: 'X-RateLimit-Remaining',
            reset: 'X-RateLimit-Reset'
          }
        },
        validation: {} as any,
        cors: {} as any,
        logging: {
          logAuthFailures: false,
          logRateLimitHits: true,
          logValidationErrors: false,
          excludeSensitiveData: true
        }
      });
    });

    it('should allow requests within limit', () => {
      const middleware = rateLimitMiddleware.limit();

      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject requests exceeding limit', () => {
      const middleware = rateLimitMiddleware.limit();

      // Make 6 requests (exceeds limit of 5)
      for (let i = 0; i < 6; i++) {
        vi.clearAllMocks();
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Last request should be rejected
      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set rate limit headers when enabled', () => {
      const middleware = rateLimitMiddleware.limit();

      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(Number));
      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
    });

    it('should set Retry-After header when rate limit exceeded', () => {
      const middleware = rateLimitMiddleware.limit();

      // Exceed limit
      for (let i = 0; i < 6; i++) {
        vi.clearAllMocks();
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(setHeaderMock).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    });

    it('should bypass rate limiting for health endpoints', () => {
      mockRequest.path = '/health';
      const middleware = rateLimitMiddleware.limit();

      // Make many requests to health endpoint
      for (let i = 0; i < 100; i++) {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(100);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should track different IPs separately', () => {
      const middleware = rateLimitMiddleware.limit();

      // Make 5 requests from IP 1
      mockRequest.ip = '192.168.1.1';
      for (let i = 0; i < 5; i++) {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Make 5 requests from IP 2
      mockRequest.ip = '192.168.1.2';
      for (let i = 0; i < 5; i++) {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(10);
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should use X-Forwarded-For header when available', () => {
      mockRequest.headers = {
        'x-forwarded-for': '203.0.113.1, 198.51.100.1'
      };

      const middleware = rateLimitMiddleware.limit();

      // Make requests - should be tracked by forwarded IP
      for (let i = 0; i < 5; i++) {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Change the forwarded IP
      mockRequest.headers = {
        'x-forwarded-for': '198.51.100.2'
      };

      // Should be treated as different client
      for (let i = 0; i < 5; i++) {
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(mockNext).toHaveBeenCalledTimes(10);
    });
  });

  describe('stats and monitoring', () => {
    it('should provide statistics about active clients', () => {
      // Clear any previous test data to ensure clean slate
      rateLimitMiddleware.clear();

      vi.mocked(securityConfig.getSecurityConfig).mockReturnValue({
        auth: {} as any,
        rateLimit: {
          enabled: true,
          windowMs: 60000,
          maxRequests: 5,
          bypassPaths: [],
          headers: {
            enabled: true,
            total: 'X-RateLimit-Limit',
            remaining: 'X-RateLimit-Remaining',
            reset: 'X-RateLimit-Reset'
          }
        },
        validation: {} as any,
        cors: {} as any,
        logging: {} as any
      });

      const middleware = rateLimitMiddleware.limit();

      // Make requests from 3 different IPs
      mockRequest.ip = '192.168.1.1';
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      mockRequest.ip = '192.168.1.2';
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      mockRequest.ip = '192.168.1.3';
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const stats = rateLimitMiddleware.getStats();

      expect(stats.activeClients).toBe(3);
      expect(stats.totalEntries).toBe(3);
    });

    it('should allow resetting limit for specific client', () => {
      vi.mocked(securityConfig.getSecurityConfig).mockReturnValue({
        auth: {} as any,
        rateLimit: {
          enabled: true,
          windowMs: 60000,
          maxRequests: 2,
          bypassPaths: [],
          headers: {
            enabled: true,
            total: 'X-RateLimit-Limit',
            remaining: 'X-RateLimit-Remaining',
            reset: 'X-RateLimit-Reset'
          }
        },
        validation: {} as any,
        cors: {} as any,
        logging: {} as any
      });

      const middleware = rateLimitMiddleware.limit();

      // Exceed limit
      for (let i = 0; i < 3; i++) {
        vi.clearAllMocks();
        middleware(mockRequest as Request, mockResponse as Response, mockNext);
      }

      expect(statusMock).toHaveBeenCalledWith(429);

      // Reset client
      rateLimitMiddleware.resetClient('127.0.0.1');

      // Should be able to make requests again
      vi.clearAllMocks();
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });
});
