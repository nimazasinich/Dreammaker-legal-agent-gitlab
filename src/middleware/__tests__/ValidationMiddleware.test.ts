/**
 * ValidationMiddleware Tests
 *
 * Tests for request validation middleware
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ValidationMiddleware, ValidationSchema } from '../ValidationMiddleware';
import * as securityConfig from '../../config/securityConfig';

// Mock security config
vi.mock('../../config/securityConfig');

describe('ValidationMiddleware', () => {
  let validationMiddleware: ValidationMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    validationMiddleware = ValidationMiddleware.getInstance();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      path: '/api/test',
      method: 'POST',
      body: {},
      query: {},
      params: {}
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

    mockNext = vi.fn();

    vi.mocked(securityConfig.getSecurityConfig).mockReturnValue({
      auth: {} as any,
      rateLimit: {} as any,
      validation: {
        enabled: true,
        maxBodySize: '10mb',
        strictMode: true
      },
      cors: {} as any,
      logging: {
        logAuthFailures: false,
        logRateLimitHits: false,
        logValidationErrors: true,
        excludeSensitiveData: true
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when validation is disabled', () => {
    it('should allow all requests to proceed', () => {
      vi.mocked(securityConfig.getSecurityConfig).mockReturnValue({
        auth: {} as any,
        rateLimit: {} as any,
        validation: {
          enabled: false,
          maxBodySize: '10mb',
          strictMode: true
        },
        cors: {} as any,
        logging: {} as any
      });

      const schema: ValidationSchema = {
        name: { type: 'string', required: true }
      };

      const middleware = validationMiddleware.validate(schema);

      // Empty body should pass when validation is disabled
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });

  describe('string validation', () => {
    it('should validate required string fields', () => {
      const schema: ValidationSchema = {
        name: { type: 'string', required: true }
      };

      mockRequest.body = { name: 'John Doe' };

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject missing required fields', () => {
      const schema: ValidationSchema = {
        name: { type: 'string', required: true }
      };

      mockRequest.body = {};

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'VALIDATION_ERROR',
          details: expect.objectContaining({
            field: 'name',
            error: 'Field is required'
          })
        })
      );
    });

    it('should validate string length constraints', () => {
      const schema: ValidationSchema = {
        name: { type: 'string', required: true, minLength: 3, maxLength: 10 }
      };

      mockRequest.body = { name: 'Jo' };

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            error: 'Minimum length is 3'
          })
        })
      );
    });

    it('should validate string pattern', () => {
      const schema: ValidationSchema = {
        email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
      };

      mockRequest.body = { email: 'invalid-email' };

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('number validation', () => {
    it('should validate number fields', () => {
      const schema: ValidationSchema = {
        age: { type: 'number', required: true }
      };

      mockRequest.body = { age: 25 };

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate number min/max constraints', () => {
      const schema: ValidationSchema = {
        age: { type: 'number', required: true, min: 18, max: 100 }
      };

      mockRequest.body = { age: 150 };

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            error: 'Maximum value is 100'
          })
        })
      );
    });
  });

  describe('array validation', () => {
    it('should validate array fields', () => {
      const schema: ValidationSchema = {
        tags: { type: 'array', required: true }
      };

      mockRequest.body = { tags: ['tag1', 'tag2'] };

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate array length constraints', () => {
      const schema: ValidationSchema = {
        tags: { type: 'array', required: true, minLength: 2, maxLength: 5 }
      };

      mockRequest.body = { tags: ['single'] };

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            error: 'Array must have at least 2 items'
          })
        })
      );
    });
  });

  describe('enum validation', () => {
    it('should validate enum values', () => {
      const schema: ValidationSchema = {
        status: { type: 'string', required: true, enum: ['active', 'inactive', 'pending'] }
      };

      mockRequest.body = { status: 'active' };

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid enum values', () => {
      const schema: ValidationSchema = {
        status: { type: 'string', required: true, enum: ['active', 'inactive', 'pending'] }
      };

      mockRequest.body = { status: 'invalid' };

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('custom validation', () => {
    it('should support custom validators', () => {
      const schema: ValidationSchema = {
        symbol: {
          type: 'string',
          required: true,
          custom: (value) => {
            if (typeof value !== 'string') return 'Must be string';
            return value.includes('/') ? true : 'Must include slash separator';
          }
        }
      };

      mockRequest.body = { symbol: 'BTC/USDT' };

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject when custom validation fails', () => {
      const schema: ValidationSchema = {
        symbol: {
          type: 'string',
          required: true,
          custom: (value) => {
            if (typeof value !== 'string') return 'Must be string';
            return value.includes('/') ? true : 'Must include slash separator';
          }
        }
      };

      mockRequest.body = { symbol: 'BTCUSDT' };

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            error: 'Must include slash separator'
          })
        })
      );
    });
  });

  describe('query and params validation', () => {
    it('should validate query parameters', () => {
      const schema: ValidationSchema = {
        page: { type: 'number', required: true, min: 1 }
      };

      mockRequest.query = { page: 5 };

      const middleware = validationMiddleware.validate(schema, 'query');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate route parameters', () => {
      const schema: ValidationSchema = {
        id: { type: 'string', required: true, pattern: /^[0-9]+$/ }
      };

      mockRequest.params = { id: '123' };

      const middleware = validationMiddleware.validate(schema, 'params');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('optional fields', () => {
    it('should allow optional fields to be omitted', () => {
      const schema: ValidationSchema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: false }
      };

      mockRequest.body = { name: 'John' };

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate optional fields when provided', () => {
      const schema: ValidationSchema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: false, min: 0, max: 120 }
      };

      mockRequest.body = { name: 'John', age: 150 };

      const middleware = validationMiddleware.validate(schema);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });
});
