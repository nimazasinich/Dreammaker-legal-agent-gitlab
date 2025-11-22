/**
 * API Validation Tests
 * 
 * Tests all API endpoints to ensure they return standard response envelopes
 * and handle errors properly with correct labels.
 */

import { Logger } from '../../src/core/Logger.js';

const logger = Logger.getInstance();

interface TestResult {
  endpoint: string;
  method: string;
  status: 'pass' | 'fail';
  statusCode?: number;
  response?: any;
  errors: string[];
  notes: string[];
}

interface ValidationReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

/**
 * Validate response envelope format
 */
function validateResponseEnvelope(response: any, endpoint: string): string[] {
  const errors: string[] = [];

  if (!response || typeof response !== 'object') {
    errors.push('Response is not an object');
    return errors;
  }

  // Check required fields
  if (!response.status) {
    errors.push('Missing required field: status');
  } else if (response.status !== 'ok' && response.status !== 'error') {
    errors.push(`Invalid status value: ${response.status} (must be 'ok' or 'error')`);
  }

  // If status is error, code should be present
  if (response.status === 'error') {
    if (!response.code) {
      errors.push('Error response missing required field: code');
    }
    if (!response.message) {
      errors.push('Error response missing required field: message');
    }

    // Validate error code format
    if (response.code) {
      const validCodes = [
        'AI_DATA_TOO_SMALL',
        'KUCOIN_HEALTH_FAIL',
        'KUCOIN_UNAVAILABLE',
        'DISABLED_BY_CONFIG',
        'INVALID_NEWS_API_KEY',
        'NOT_FOUND',
        'INTERNAL_ERROR',
        'VALIDATION_ERROR',
        'TIMEOUT',
        'NETWORK_ERROR'
      ];

      const isValidCode = validCodes.includes(response.code) || 
                         response.code.startsWith('NEWS_API_FAIL:') ||
                         response.code.startsWith('HTTP_');

      if (!isValidCode) {
        errors.push(`Unknown error code: ${response.code}`);
      }
    }
  }

  return errors;
}

/**
 * Test a single API endpoint
 */
async function testEndpoint(
  method: string,
  endpoint: string,
  body?: any,
  expectedStatus?: 'ok' | 'error'
): Promise<TestResult> {
  const result: TestResult = {
    endpoint,
    method,
    status: 'pass',
    errors: [],
    notes: []
  };

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`http://localhost:5173${endpoint}`, options);
    result.statusCode = response.status;

    const data = await response.json();
    result.response = data;

    // Validate response envelope
    const envelopeErrors = validateResponseEnvelope(data, endpoint);
    result.errors.push(...envelopeErrors);

    // Check expected status if provided
    if (expectedStatus && data.status !== expectedStatus) {
      result.errors.push(`Expected status '${expectedStatus}' but got '${data.status}'`);
    }

    // Log structured errors
    if (data.status === 'error') {
      result.notes.push(`Error code: ${data.code}, message: ${data.message}`);
    }

    // Set overall status
    if (result.errors.length > 0) {
      result.status = 'fail';
    }

  } catch (error: any) {
    result.status = 'fail';
    result.errors.push(`Request failed: ${error.message}`);
  }

  return result;
}

/**
 * Run all validation tests
 */
export async function runValidationTests(): Promise<ValidationReport> {
  const results: TestResult[] = [];
  const startTime = new Date().toISOString();

  logger.info('Starting API validation tests...');

  // Test core endpoints
  const endpoints = [
    { method: 'GET', path: '/api/health', expectedStatus: 'ok' as const },
    { method: 'GET', path: '/api/diagnostics', expectedStatus: 'ok' as const },
    { method: 'GET', path: '/api/portfolio', expectedStatus: 'ok' as const },
    { method: 'GET', path: '/api/positions', expectedStatus: 'ok' as const },
    { method: 'GET', path: '/api/market/prices', expectedStatus: 'ok' as const },
    { method: 'GET', path: '/api/ai/signals', expectedStatus: 'ok' as const },
    { method: 'POST', path: '/api/ai/predict', body: { symbol: 'BTC' }, expectedStatus: 'ok' as const },
    { method: 'GET', path: '/api/proxy/news', expectedStatus: 'ok' as const },
    { method: 'GET', path: '/api/nonexistent', expectedStatus: 'error' as const }
  ];

  for (const ep of endpoints) {
    logger.info(`Testing ${ep.method} ${ep.path}`);
    const result = await testEndpoint(ep.method, ep.path, ep.body, ep.expectedStatus);
    results.push(result);

    // Brief delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;

  const report: ValidationReport = {
    timestamp: startTime,
    totalTests: results.length,
    passed,
    failed,
    results
  };

  logger.info(`Validation tests complete: ${passed}/${results.length} passed`);

  return report;
}

/**
 * Main test runner
 */
if (require.main === module) {
  runValidationTests().then(report => {
    console.log('\n=== API Validation Report ===\n');
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passed}`);
    console.log(`Failed: ${report.failed}`);
    console.log(`\nResults:`);

    report.results.forEach(result => {
      const status = result.status === 'pass' ? '✓' : '✗';
      console.log(`\n${status} ${result.method} ${result.endpoint}`);
      
      if (result.errors.length > 0) {
        console.log('  Errors:');
        result.errors.forEach(err => console.log(`    - ${err}`));
      }
      
      if (result.notes.length > 0) {
        console.log('  Notes:');
        result.notes.forEach(note => console.log(`    - ${note}`));
      }
    });

    // Write report to file
    const fs = require('fs');
    fs.writeFileSync(
      '/workspace/cursor_reports/validation_report.json',
      JSON.stringify(report, null, 2)
    );

    process.exit(report.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}
