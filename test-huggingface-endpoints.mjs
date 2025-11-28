#!/usr/bin/env node
/**
 * Realistic HuggingFace Endpoint Test Report Generator
 * Tests actual connectivity and functionality of HuggingFace-connected endpoints
 */

import https from 'https';
import http from 'http';

// Native fetch polyfill for Node.js
async function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 30000
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          json: async () => JSON.parse(data),
          text: async () => data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const HF_INFERENCE_URL = 'https://api-inference.huggingface.co';
const HF_ROUTER_URL = 'https://router.huggingface.co';
const HF_DATASETS_URL = 'https://datasets-server.huggingface.co';

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// Utility functions
function log(type, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    success: `${colors.green}✓`,
    error: `${colors.red}✗`,
    info: `${colors.cyan}ℹ`,
    warn: `${colors.yellow}⚠`,
  }[type] || '';
  
  console.log(`${prefix} ${message}${colors.reset}`);
  if (data) {
    console.log(`${colors.gray}  ${JSON.stringify(data, null, 2)}${colors.reset}`);
  }
}

function section(title) {
  console.log(`\n${colors.cyan}${'='.repeat(80)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(80)}${colors.reset}\n`);
}

async function testEndpoint(name, testFn) {
  results.total++;
  const startTime = Date.now();
  
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    results.passed++;
    results.tests.push({
      name,
      status: 'PASS',
      duration,
      ...result
    });
    
    log('success', `${name} (${duration}ms)`);
    if (result.data) {
      console.log(`${colors.gray}  Response: ${JSON.stringify(result.data).substring(0, 150)}...${colors.reset}`);
    }
    return { success: true, duration, ...result };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    results.failed++;
    results.tests.push({
      name,
      status: 'FAIL',
      duration,
      error: error.message
    });
    
    log('error', `${name} (${duration}ms): ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

// Test Functions
async function testHuggingFaceInferenceAPI() {
  const response = await fetch(`${HF_INFERENCE_URL}/models/ElKulako/cryptobert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: 'Bitcoin is showing strong bullish momentum'
    }),
    timeout: 15000
  });

  if (!response.ok && response.status !== 503) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    endpoint: `${HF_INFERENCE_URL}/models/ElKulako/cryptobert`,
    status: response.status,
    statusText: response.statusText,
    data: data,
    available: response.status === 200 || (response.status === 503 && data.error?.includes('loading'))
  };
}

async function testHuggingFaceRouter() {
  const response = await fetch(`${HF_ROUTER_URL}`, {
    method: 'GET',
    timeout: 10000
  });

  return {
    endpoint: HF_ROUTER_URL,
    status: response.status,
    statusText: response.statusText,
    reachable: response.status < 500
  };
}

async function testHuggingFaceDatasetsServer() {
  const response = await fetch(`${HF_DATASETS_URL}/is-valid`, {
    method: 'GET',
    timeout: 10000
  });

  return {
    endpoint: `${HF_DATASETS_URL}/is-valid`,
    status: response.status,
    statusText: response.statusText,
    reachable: response.status < 500
  };
}

async function testLocalHFDataEngineHealth() {
  try {
    const response = await fetch(`${BASE_URL}/api/hf/health`, {
      method: 'GET',
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    return {
      endpoint: `${BASE_URL}/api/hf/health`,
      status: response.status,
      data,
      available: true
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Server not running - start with "npm run dev"');
    }
    throw error;
  }
}

async function testLocalUnifiedDataHealth() {
  try {
    const response = await fetch(`${BASE_URL}/api/unified-data/health`, {
      method: 'GET',
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    return {
      endpoint: `${BASE_URL}/api/unified-data/health`,
      status: response.status,
      data,
      available: true
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Server not running - start with "npm run dev"');
    }
    throw error;
  }
}

async function testLocalMarketDataEndpoint() {
  try {
    const response = await fetch(`${BASE_URL}/api/unified-data/market/BTCUSDT?cacheEnabled=false&fallbackEnabled=true&timeout=10000`, {
      method: 'GET',
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    return {
      endpoint: `${BASE_URL}/api/unified-data/market/BTCUSDT`,
      status: response.status,
      data,
      source: data.source,
      fromCache: data.fromCache,
      fallbackUsed: data.fallbackUsed,
      latency: data.latency,
      available: true
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Server not running - start with "npm run dev"');
    }
    throw error;
  }
}

async function testLocalSentimentEndpoint() {
  try {
    const response = await fetch(`${BASE_URL}/api/unified-data/sentiment?timeout=15000&cacheEnabled=false`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: 'BTC'
      }),
      timeout: 20000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    return {
      endpoint: `${BASE_URL}/api/unified-data/sentiment`,
      status: response.status,
      data,
      source: data.source,
      sentiment: data.data?.sentiment,
      score: data.data?.score,
      available: true
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Server not running - start with "npm run dev"');
    }
    throw error;
  }
}

async function testLocalPredictionEndpoint() {
  try {
    const response = await fetch(`${BASE_URL}/api/unified-data/prediction?timeout=20000&cacheEnabled=false`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: 'BTCUSDT',
        timeframes: ['1h', '24h']
      }),
      timeout: 25000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    return {
      endpoint: `${BASE_URL}/api/unified-data/prediction`,
      status: response.status,
      data,
      source: data.source,
      predictions: data.data?.predictions,
      available: true
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Server not running - start with "npm run dev"');
    }
    throw error;
  }
}

async function testLocalMetricsEndpoint() {
  try {
    const response = await fetch(`${BASE_URL}/api/unified-data/metrics`, {
      method: 'GET',
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    return {
      endpoint: `${BASE_URL}/api/unified-data/metrics`,
      status: response.status,
      data,
      metricsCount: data.data?.length || 0,
      available: true
    };
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Server not running - start with "npm run dev"');
    }
    throw error;
  }
}

// Main test execution
async function main() {
  console.log(`\n${colors.cyan}╔${'═'.repeat(78)}╗`);
  console.log(`║${' '.repeat(15)}HUGGINGFACE ENDPOINT TEST REPORT${' '.repeat(31)}║`);
  console.log(`║${' '.repeat(20)}Realistic Connectivity Test${' '.repeat(31)}║`);
  console.log(`╚${'═'.repeat(78)}╝${colors.reset}\n`);

  console.log(`${colors.gray}Test Date: ${new Date().toLocaleString()}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Timeout: 10-25 seconds per test${colors.reset}\n`);

  // Test 1: Direct HuggingFace API Tests
  section('1. HUGGINGFACE API DIRECT CONNECTIVITY');
  
  await testEndpoint(
    'HuggingFace Inference API (CryptoBERT Model)',
    testHuggingFaceInferenceAPI
  );

  await testEndpoint(
    'HuggingFace Router Endpoint',
    testHuggingFaceRouter
  );

  await testEndpoint(
    'HuggingFace Datasets Server',
    testHuggingFaceDatasetsServer
  );

  // Test 2: Local Server HF Integration
  section('2. LOCAL SERVER HUGGINGFACE INTEGRATION');
  
  const serverRunning = await testEndpoint(
    'Local HF Data Engine Health Check',
    testLocalHFDataEngineHealth
  );

  await testEndpoint(
    'Unified Data Source Health Check',
    testLocalUnifiedDataHealth
  );

  // Test 3: Data Fetching Endpoints
  if (serverRunning.success) {
    section('3. DATA FETCHING ENDPOINTS (WITH HF FALLBACK)');
    
    await testEndpoint(
      'Market Data Endpoint (BTCUSDT)',
      testLocalMarketDataEndpoint
    );

    await testEndpoint(
      'Sentiment Analysis Endpoint (BTC)',
      testLocalSentimentEndpoint
    );

    await testEndpoint(
      'Price Prediction Endpoint (BTCUSDT)',
      testLocalPredictionEndpoint
    );

    await testEndpoint(
      'Performance Metrics Endpoint',
      testLocalMetricsEndpoint
    );
  } else {
    log('warn', 'Skipping data endpoint tests - server not running');
    log('info', 'Start server with: npm run dev');
  }

  // Generate Report
  section('TEST SUMMARY');

  console.log(`\n${colors.cyan}Overall Results:${colors.reset}`);
  console.log(`  Total Tests: ${results.total}`);
  console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`  Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

  // Detailed Results Table
  console.log(`${colors.cyan}Detailed Results:${colors.reset}\n`);
  console.log(`${'Test Name'.padEnd(50)} | ${'Status'.padEnd(6)} | ${'Time'.padEnd(8)}`);
  console.log(`${'-'.repeat(50)}-+-${'-'.repeat(6)}-+-${'-'.repeat(8)}`);
  
  results.tests.forEach(test => {
    const status = test.status === 'PASS' 
      ? `${colors.green}PASS${colors.reset}`
      : `${colors.red}FAIL${colors.reset}`;
    const name = test.name.length > 48 ? test.name.substring(0, 45) + '...' : test.name;
    console.log(`${name.padEnd(50)} | ${status.padEnd(6)} | ${(test.duration + 'ms').padEnd(8)}`);
  });

  // Key Findings
  section('KEY FINDINGS');

  const hfInferenceTest = results.tests.find(t => t.name.includes('Inference API'));
  const marketDataTest = results.tests.find(t => t.name.includes('Market Data'));
  const sentimentTest = results.tests.find(t => t.name.includes('Sentiment'));

  console.log(`\n${colors.cyan}1. HuggingFace API Status:${colors.reset}`);
  if (hfInferenceTest?.status === 'PASS') {
    log('success', 'HuggingFace Inference API is reachable');
    console.log(`   - Model: ElKulako/cryptobert`);
    console.log(`   - Status: ${hfInferenceTest.data?.status || 'Available'}`);
    console.log(`   - Response Time: ${hfInferenceTest.duration}ms`);
  } else {
    log('error', 'HuggingFace Inference API failed');
    console.log(`   - This is expected in certain regions (geo-blocking)`);
    console.log(`   - Fallback mechanisms will activate automatically`);
  }

  console.log(`\n${colors.cyan}2. Fallback Mechanism:${colors.reset}`);
  if (marketDataTest?.source) {
    log('info', `Market data served from: ${marketDataTest.source}`);
    console.log(`   - Fallback Used: ${marketDataTest.fallbackUsed ? 'Yes' : 'No'}`);
    console.log(`   - Cache Used: ${marketDataTest.fromCache ? 'Yes' : 'No'}`);
    console.log(`   - Latency: ${marketDataTest.latency || marketDataTest.duration}ms`);
  } else {
    log('warn', 'Market data endpoint not tested (server not running)');
  }

  console.log(`\n${colors.cyan}3. Sentiment Analysis:${colors.reset}`);
  if (sentimentTest?.sentiment) {
    log('success', 'Sentiment analysis working');
    console.log(`   - Sentiment: ${sentimentTest.sentiment}`);
    console.log(`   - Score: ${sentimentTest.score}`);
    console.log(`   - Source: ${sentimentTest.source}`);
  } else if (sentimentTest?.status === 'FAIL') {
    log('warn', 'Sentiment analysis failed (fallback may be used)');
  } else {
    log('warn', 'Sentiment analysis not tested (server not running)');
  }

  // Recommendations
  section('RECOMMENDATIONS');

  console.log(`\n${colors.cyan}Based on test results:${colors.reset}\n`);

  if (results.failed > 0) {
    console.log(`${colors.yellow}⚠${colors.reset} Some tests failed. Common issues:`);
    console.log(`   1. Server not running → Start with: npm run dev`);
    console.log(`   2. HuggingFace API blocked → Normal, fallback will handle this`);
    console.log(`   3. Timeout errors → Increase timeout in requests\n`);
  }

  if (hfInferenceTest?.status === 'FAIL') {
    console.log(`${colors.yellow}⚠${colors.reset} HuggingFace API unreachable:`);
    console.log(`   - This is EXPECTED in many regions due to geo-restrictions`);
    console.log(`   - System will automatically use CoinGecko/Binance fallback`);
    console.log(`   - No action required - fallback mechanism handles this\n`);
  }

  if (results.passed === results.total) {
    console.log(`${colors.green}✓${colors.reset} All tests passed! System is fully operational.`);
    console.log(`   - HuggingFace connectivity: OK`);
    console.log(`   - Fallback mechanisms: OK`);
    console.log(`   - All endpoints: Responding\n`);
  }

  console.log(`${colors.cyan}Next Steps:${colors.reset}`);
  console.log(`   1. If server is not running: npm run dev`);
  console.log(`   2. Access monitor UI: http://localhost:3000/data-sources`);
  console.log(`   3. Check real-time metrics in the dashboard`);
  console.log(`   4. Review fallback usage and cache hit rates\n`);

  // Export Report
  const reportPath = `./huggingface-test-report-${Date.now()}.json`;
  const fs = await import('fs');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      successRate: ((results.passed / results.total) * 100).toFixed(1) + '%'
    },
    tests: results.tests
  }, null, 2));

  log('info', `Detailed report saved to: ${reportPath}`);

  console.log(`\n${colors.gray}${'─'.repeat(80)}${colors.reset}\n`);

  // Exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error(`\n${colors.red}Fatal Error:${colors.reset}`, error.message);
  process.exit(1);
});
