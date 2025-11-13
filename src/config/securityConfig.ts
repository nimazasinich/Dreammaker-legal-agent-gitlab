/**
 * Security Configuration Loader
 *
 * Loads security settings from config file and environment variables
 * Provides type-safe access to security configuration
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '../core/Logger';

export interface AuthConfig {
  enabled: boolean;
  mode: 'apiKey' | 'jwt';
  apiKeyHeader: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  bypassPaths: string[];
}

export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  bypassPaths: string[];
  headers: {
    enabled: boolean;
    total: string;
    remaining: string;
    reset: string;
  };
}

export interface ValidationConfig {
  enabled: boolean;
  maxBodySize: string;
  strictMode: boolean;
}

export interface CorsConfig {
  enabled: boolean;
  origins: string[];
  credentials: boolean;
}

export interface LoggingConfig {
  logAuthFailures: boolean;
  logRateLimitHits: boolean;
  logValidationErrors: boolean;
  excludeSensitiveData: boolean;
}

export interface SecurityConfig {
  auth: AuthConfig;
  rateLimit: RateLimitConfig;
  validation: ValidationConfig;
  cors: CorsConfig;
  logging: LoggingConfig;
}

/**
 * Default security configuration (safe defaults - everything off except validation)
 */
const DEFAULT_CONFIG: SecurityConfig = {
  auth: {
    enabled: false,
    mode: 'apiKey',
    apiKeyHeader: 'x-api-key',
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    jwtExpiresIn: '24h',
    bypassPaths: ['/status', '/health', '/status/health', '/api/health', '/metrics']
  },
  rateLimit: {
    enabled: false,
    windowMs: 60000,
    maxRequests: 60,
    bypassPaths: ['/status', '/health', '/status/health', '/api/health', '/metrics'],
    headers: {
      enabled: true,
      total: 'X-RateLimit-Limit',
      remaining: 'X-RateLimit-Remaining',
      reset: 'X-RateLimit-Reset'
    }
  },
  validation: {
    enabled: true,
    maxBodySize: '10mb',
    strictMode: true
  },
  cors: {
    enabled: true,
    origins: ['http://localhost:3000', 'http://localhost:3005'],
    credentials: true
  },
  logging: {
    logAuthFailures: true,
    logRateLimitHits: true,
    logValidationErrors: true,
    excludeSensitiveData: true
  }
};

let cachedConfig: SecurityConfig | null = null;

/**
 * Load security configuration from file and environment
 */
export function loadSecurityConfig(): SecurityConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const logger = Logger.getInstance();
  let fileConfig: Partial<SecurityConfig> = {};

  try {
    const configPath = path.join(process.cwd(), 'config', 'security.config.json');

    if (fs.existsSync(configPath)) {
      const rawData = fs.readFileSync(configPath, 'utf-8');
      const parsedConfig = JSON.parse(rawData);

      // Remove version/metadata fields
      const { version, updatedAt, description, ...config } = parsedConfig;
      fileConfig = config;

      logger.info('Security config loaded from file', { path: configPath });
    } else {
      logger.info('Security config file not found, using defaults');
    }
  } catch (error) {
    logger.warn('Failed to load security config, using defaults', {}, error as Error);
  }

  // Merge with defaults
  const config: SecurityConfig = {
    auth: {
      ...DEFAULT_CONFIG.auth,
      ...fileConfig.auth,
      // Override with environment variables
      enabled: process.env.SECURITY_AUTH_ENABLED === 'true' || fileConfig.auth?.enabled || DEFAULT_CONFIG.auth.enabled,
      mode: (process.env.SECURITY_AUTH_MODE as 'apiKey' | 'jwt') || fileConfig.auth?.mode || DEFAULT_CONFIG.auth.mode,
      jwtSecret: process.env.JWT_SECRET || fileConfig.auth?.jwtSecret || DEFAULT_CONFIG.auth.jwtSecret
    },
    rateLimit: {
      ...DEFAULT_CONFIG.rateLimit,
      ...fileConfig.rateLimit,
      enabled: process.env.SECURITY_RATELIMIT_ENABLED === 'true' || fileConfig.rateLimit?.enabled || DEFAULT_CONFIG.rateLimit.enabled,
      windowMs: parseInt(process.env.SECURITY_RATELIMIT_WINDOW_MS || String(fileConfig.rateLimit?.windowMs || DEFAULT_CONFIG.rateLimit.windowMs)),
      maxRequests: parseInt(process.env.SECURITY_RATELIMIT_MAX_REQUESTS || String(fileConfig.rateLimit?.maxRequests || DEFAULT_CONFIG.rateLimit.maxRequests))
    },
    validation: {
      ...DEFAULT_CONFIG.validation,
      ...fileConfig.validation,
      enabled: process.env.SECURITY_VALIDATION_ENABLED !== 'false' && (fileConfig.validation?.enabled !== false)
    },
    cors: {
      ...DEFAULT_CONFIG.cors,
      ...fileConfig.cors
    },
    logging: {
      ...DEFAULT_CONFIG.logging,
      ...fileConfig.logging
    }
  };

  cachedConfig = config;
  return config;
}

/**
 * Get current security configuration
 */
export function getSecurityConfig(): SecurityConfig {
  return cachedConfig || loadSecurityConfig();
}

/**
 * Reload security configuration (for hot-reload scenarios)
 */
export function reloadSecurityConfig(): SecurityConfig {
  cachedConfig = null;
  return loadSecurityConfig();
}
