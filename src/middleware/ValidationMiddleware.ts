/**
 * Validation Middleware
 *
 * Request validation using schema-based approach
 * Provides type-safe validation for API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../core/Logger';
import { getSecurityConfig } from '../config/securityConfig';
import { sendError, ErrorResponses } from '../utils/httpError';

/**
 * Validation schema definition
 */
export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: unknown[];
    items?: ValidationSchema;  // For arrays
    properties?: ValidationSchema;  // For objects
    custom?: (value: unknown) => boolean | string;  // Custom validator
  };
}

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; error: string }>;
}

export class ValidationMiddleware {
  private static instance: ValidationMiddleware;
  private logger = Logger.getInstance();

  private constructor() {}

  public static getInstance(): ValidationMiddleware {
    if (!ValidationMiddleware.instance) {
      ValidationMiddleware.instance = new ValidationMiddleware();
    }
    return ValidationMiddleware.instance;
  }

  /**
   * Create validation middleware for a specific schema
   */
  public validate(schema: ValidationSchema, source: 'body' | 'query' | 'params' = 'body') {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const config = getSecurityConfig();

        // Skip if validation is disabled
        if (!config.validation.enabled) {
          return next();
        }

        const data = req[source];
        const result = this.validateData(data, schema);

        if (!result.valid) {
          if (config.logging.logValidationErrors) {
            this.logger.warn('Validation failed', {
              path: req.path,
              method: req.method,
              source,
              errors: result.errors
            });
          }

          // Send first error
          const firstError = result.errors[0];
          return sendError(
            res,
            ErrorResponses.validationError(firstError.field, firstError.error),
            'Validation failed'
          );
        }

        next();
      } catch (error) {
        this.logger.error('Validation error', {}, error as Error);
        sendError(res, ErrorResponses.internalError('Validation failed'));
      }
    };
  }

  /**
   * Validate data against schema
   */
  private validateData(data: unknown, schema: ValidationSchema): ValidationResult {
    const errors: Array<{ field: string; error: string }> = [];

    if (typeof data !== 'object' || data === null) {
      return {
        valid: false,
        errors: [{ field: 'root', error: 'Expected an object' }]
      };
    }

    const dataObj = data as Record<string, unknown>;

    // Validate each field in schema
    for (const [field, rules] of Object.entries(schema)) {
      const value = dataObj[field];

      // Check required
      if (rules.required && (value === undefined || value === null)) {
        errors.push({ field, error: 'Field is required' });
        continue;
      }

      // Skip validation if field is optional and not provided
      if (!rules.required && (value === undefined || value === null)) {
        continue;
      }

      // Type validation
      const typeError = this.validateType(value, rules.type, field);
      if (typeError) {
        errors.push(typeError);
        continue;
      }

      // Additional validations based on type
      if (rules.type === 'string' && typeof value === 'string') {
        const stringError = this.validateString(value, rules, field);
        if (stringError) errors.push(stringError);
      }

      if (rules.type === 'number' && typeof value === 'number') {
        const numberError = this.validateNumber(value, rules, field);
        if (numberError) errors.push(numberError);
      }

      if (rules.type === 'array' && Array.isArray(value)) {
        const arrayError = this.validateArray(value, rules, field);
        if (arrayError) errors.push(arrayError);
      }

      if (rules.type === 'object' && typeof value === 'object' && value !== null) {
        const objectError = this.validateObject(value, rules, field);
        if (objectError) errors.push(objectError);
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({
          field,
          error: `Must be one of: ${rules.enum.join(', ')}`
        });
      }

      // Custom validation
      if (rules.custom) {
        const customResult = rules.custom(value);
        if (customResult !== true) {
          errors.push({
            field,
            error: typeof customResult === 'string' ? customResult : 'Custom validation failed'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate type
   */
  private validateType(
    value: unknown,
    expectedType: string,
    field: string
  ): { field: string; error: string } | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== expectedType) {
      return {
        field,
        error: `Expected ${expectedType}, got ${actualType}`
      };
    }

    return null;
  }

  /**
   * Validate string
   */
  private validateString(
    value: string,
    rules: ValidationSchema[string],
    field: string
  ): { field: string; error: string } | null {
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      return {
        field,
        error: `Minimum length is ${rules.minLength}`
      };
    }

    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      return {
        field,
        error: `Maximum length is ${rules.maxLength}`
      };
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return {
        field,
        error: `Does not match required pattern`
      };
    }

    return null;
  }

  /**
   * Validate number
   */
  private validateNumber(
    value: number,
    rules: ValidationSchema[string],
    field: string
  ): { field: string; error: string } | null {
    if (rules.min !== undefined && value < rules.min) {
      return {
        field,
        error: `Minimum value is ${rules.min}`
      };
    }

    if (rules.max !== undefined && value > rules.max) {
      return {
        field,
        error: `Maximum value is ${rules.max}`
      };
    }

    return null;
  }

  /**
   * Validate array
   */
  private validateArray(
    value: unknown[],
    rules: ValidationSchema[string],
    field: string
  ): { field: string; error: string } | null {
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      return {
        field,
        error: `Array must have at least ${rules.minLength} items`
      };
    }

    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      return {
        field,
        error: `Array must have at most ${rules.maxLength} items`
      };
    }

    // Validate array items if schema provided
    if (rules.items) {
      for (let i = 0; i < value.length; i++) {
        const itemResult = this.validateData(value[i], rules.items);
        if (!itemResult.valid) {
          return {
            field: `${field}[${i}]`,
            error: itemResult.errors[0]?.error || 'Invalid item'
          };
        }
      }
    }

    return null;
  }

  /**
   * Validate object
   */
  private validateObject(
    value: object,
    rules: ValidationSchema[string],
    field: string
  ): { field: string; error: string } | null {
    if (rules.properties) {
      const result = this.validateData(value, rules.properties);
      if (!result.valid) {
        return {
          field: `${field}.${result.errors[0]?.field}`,
          error: result.errors[0]?.error || 'Invalid property'
        };
      }
    }

    return null;
  }
}

// Export singleton instance
export const validationMiddleware = ValidationMiddleware.getInstance();
