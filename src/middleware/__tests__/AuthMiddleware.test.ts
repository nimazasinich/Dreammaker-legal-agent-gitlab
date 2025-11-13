/**
 * AuthMiddleware Tests
 *
 * Tests for authentication middleware with API Key and JWT modes
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from '../AuthMiddleware';
import * as securityConfig from '../../config/securityConfig';
import jwt from 'jsonwebtoken';

// Mock security config
vi.mock('../../config/securityConfig');

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authMiddleware = AuthMiddleware.getInstance();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      path: '/api/test',
      ip: '127.0.0.1',
      method: 'GET',
      headers: {}
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

    mockNext = vi.fn();

    // Reset environment
    delete process.env.BOLT_API_KEY;
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when auth is disabled', () => {
    it('should allow request to proceed without authentication', async () => {
      vi.mocked(securityConfig.getSecurityConfig).mockReturnValue({
        auth: {
          enabled: false,
          mode: 'apiKey',
          apiKeyHeader: 'x-api-key',
          jwtSecret: 'secret',
          jwtExpiresIn: '24h',
          bypassPaths: []
        },
        rateLimit: {} as any,
        validation: {} as any,
        cors: {} as any,
        logging: {} as any
      });

      const middleware = authMiddleware.authenticate();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('when auth is enabled with API Key mode', () => {
    beforeEach(() => {
      process.env.BOLT_API_KEY = 'test-api-key-123';

      vi.mocked(securityConfig.getSecurityConfig).mockReturnValue({
        auth: {
          enabled: true,
          mode: 'apiKey',
          apiKeyHeader: 'x-api-key',
          jwtSecret: 'secret',
          jwtExpiresIn: '24h',
          bypassPaths: ['/health', '/status']
        },
        rateLimit: {} as any,
        validation: {} as any,
        cors: {} as any,
        logging: {
          logAuthFailures: true,
          logRateLimitHits: false,
          logValidationErrors: false,
          excludeSensitiveData: true
        }
      });
    });

    it('should allow requests with valid API key', async () => {
      mockRequest.headers = {
        'x-api-key': 'test-api-key-123'
      };

      const middleware = authMiddleware.authenticate();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.role).toBe('api-key');
    });

    it('should reject requests without API key', async () => {
      const middleware = authMiddleware.authenticate();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'INVALID_API_KEY'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid API key', async () => {
      mockRequest.headers = {
        'x-api-key': 'wrong-api-key'
      };

      const middleware = authMiddleware.authenticate();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'INVALID_API_KEY'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should bypass authentication for health endpoints', async () => {
      mockRequest.path = '/health';

      const middleware = authMiddleware.authenticate();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should bypass authentication for status endpoints', async () => {
      mockRequest.path = '/status';

      const middleware = authMiddleware.authenticate();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('when auth is enabled with JWT mode', () => {
    beforeEach(() => {
      process.env.JWT_SECRET = 'test-jwt-secret';

      vi.mocked(securityConfig.getSecurityConfig).mockReturnValue({
        auth: {
          enabled: true,
          mode: 'jwt',
          apiKeyHeader: 'x-api-key',
          jwtSecret: 'test-jwt-secret',
          jwtExpiresIn: '24h',
          bypassPaths: ['/health']
        },
        rateLimit: {} as any,
        validation: {} as any,
        cors: {} as any,
        logging: {
          logAuthFailures: true,
          logRateLimitHits: false,
          logValidationErrors: false,
          excludeSensitiveData: true
        }
      });
    });

    it('should allow requests with valid JWT token', async () => {
      const token = jwt.sign(
        { sub: 'user123', email: 'test@example.com', role: 'admin' },
        'test-jwt-secret',
        { expiresIn: '1h' }
      );

      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      const middleware = authMiddleware.authenticate();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.id).toBe('user123');
      expect(mockRequest.user?.email).toBe('test@example.com');
      expect(mockRequest.user?.role).toBe('admin');
    });

    it('should reject requests without Bearer token', async () => {
      const middleware = authMiddleware.authenticate();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'INVALID_TOKEN'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests with invalid JWT token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      const middleware = authMiddleware.authenticate();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { sub: 'user123', email: 'test@example.com' },
        'test-jwt-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`
      };

      const middleware = authMiddleware.authenticate();
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('token generation utility', () => {
    it('should generate valid JWT token', () => {
      vi.mocked(securityConfig.getSecurityConfig).mockReturnValue({
        auth: {
          enabled: true,
          mode: 'jwt',
          apiKeyHeader: 'x-api-key',
          jwtSecret: 'test-jwt-secret',
          jwtExpiresIn: '24h',
          bypassPaths: []
        },
        rateLimit: {} as any,
        validation: {} as any,
        cors: {} as any,
        logging: {} as any
      });

      const token = AuthMiddleware.generateToken(
        { userId: '123', email: 'test@example.com' },
        '1h'
      );

      expect(token).toBeTruthy();

      // Verify token can be decoded
      const decoded = jwt.verify(token, 'test-jwt-secret') as Record<string, unknown>;
      expect(decoded.userId).toBe('123');
      expect(decoded.email).toBe('test@example.com');
    });
  });
});
