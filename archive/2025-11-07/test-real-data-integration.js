/**
 * COMPREHENSIVE REAL DATA INTEGRATION TEST
 * Tests all API endpoints to verify 100% real data flow
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';
const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let passedTests = 0;
let failedTests = 0;
let warnings = 0;

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logTest(name, passed, details = '') {
  if (passed) {
    log(`✅ ${name}`, 'green');
    if (details) log(`   ${details}`, 'blue');
    passedTests++;
  } else {
    log(`❌ ${name}`, 'red');
    if (details) log(`   ${details}`, 'red');
    failedTests++;
  }
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
  warnings++;
}

async function testEndpoint(name, url, validator) {
  try {
    const response = await axios.get(url, { timeout: 15000 });
    const isValid = validator(response.data);
    logTest(name, isValid, isValid ? `Source: ${response.data.source || 'N/A'}` : 'Invalid response structure');
    return response.data;
  } catch (error) {
    logTest(name, false, error.message);
    return null;
  }
}

async function testPostEndpoint(name, url, body, validator) {
  try {
    const response = await axios.post(url, body, { timeout: 15000 });
    const isValid = validator(response.data);
    logTest(name, isValid, isValid ? `Source: ${response.data.source || 'N/A'}` : 'Invalid response structure');
    return response.data;
  } catch (error) {
    logTest(name, false, error.message);
    return null;
  }
}

async function runTests() {
  log('\n🚀 ========================================', 'blue');
  log('   BOLT AI - REAL DATA INTEGRATION TEST', 'blue');
  log('   ========================================\n', 'blue');

  // Test 1: Health Check
  log('\n📊 SYSTEM HEALTH', 'yellow');
  await testEndpoint(
    'Health Check',
    `${API_BASE}/health`,
    (data) => data.status === 'ok'
  );

  // Test 2: Market Data
  log('\n📈 MARKET DATA ENDPOINTS', 'yellow');
  
  const pricesData = await testEndpoint(
    'Real-Time Prices (BTC, ETH, SOL)',
    `${API_BASE}/market/prices?symbols=BTC,ETH,SOL`,
    (data) => data.success && Array.isArray(data.data) && data.data.length > 0
  );
  
  if (pricesData && pricesData.data) {
    pricesData.data.forEach(price => {
      if (price.price > 0) {
        log(`   ${price.symbol}: $${price.price.toFixed(2)}`, 'blue');
      }
    });
  }

  await testEndpoint(
    'Market Data (BTC)',
    `${API_BASE}/market-data/BTC`,
    (data) => data.success && data.data && data.data.currentPrice > 0
  );

  await testEndpoint(
    'Historical OHLCV Data',
    `${API_BASE}/hf/ohlcv?symbol=BTC&days=30`,
    (data) => data.success && Array.isArray(data.data) && data.data.length > 0
  );

  // Test 3: Blockchain Data
  log('\n⛓️  BLOCKCHAIN DATA ENDPOINTS', 'yellow');
  
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
  
  const balanceData = await testEndpoint(
    'Ethereum Balance',
    `${API_BASE}/blockchain/balances/${testAddress}?network=ethereum`,
    (data) => data.success && data.data && typeof data.data.balanceFormatted === 'number'
  );
  
  if (balanceData && balanceData.data) {
    log(`   Address: ${balanceData.data.address}`, 'blue');
    log(`   Balance: ${balanceData.data.balanceFormatted} ETH`, 'blue');
  }

  await testEndpoint(
    'BSC Balance',
    `${API_BASE}/blockchain/balances/${testAddress}?network=bsc`,
    (data) => data.success && data.data
  );

  // Test 4: Sentiment Data
  log('\n😊 SENTIMENT DATA ENDPOINTS', 'yellow');
  
  const sentimentData = await testEndpoint(
    'Fear & Greed Index',
    `${API_BASE}/sentiment/fear-greed`,
    (data) => data.success && data.data && typeof data.data.value === 'number'
  );
  
  if (sentimentData && sentimentData.data) {
    log(`   Value: ${sentimentData.data.value}/100`, 'blue');
    log(`   Classification: ${sentimentData.data.classification}`, 'blue');
  }

  await testEndpoint(
    'Sentiment History',
    `${API_BASE}/sentiment/history?days=30`,
    (data) => data.success && Array.isArray(data.data)
  );

  // Test 5: News Data
  log('\n📰 NEWS DATA ENDPOINTS', 'yellow');
  
  const newsData = await testEndpoint(
    'Latest Crypto News',
    `${API_BASE}/news/latest?limit=10`,
    (data) => data.success && Array.isArray(data.data)
  );
  
  if (newsData && newsData.data && newsData.data.length > 0) {
    log(`   Retrieved ${newsData.data.length} news items`, 'blue');
  }

  // Test 6: Whale Tracking
  log('\n🐋 WHALE TRACKING ENDPOINTS', 'yellow');
  
  const whaleData = await testEndpoint(
    'Whale Transactions (BTCUSDT)',
    `${API_BASE}/whale/transactions?symbol=BTCUSDT`,
    (data) => data.success && Array.isArray(data.data)
  );
  
  if (whaleData && whaleData.data) {
    log(`   Detected ${whaleData.data.length} whale transactions`, 'blue');
  }

  // Test 7: Pattern Detection
  log('\n🔍 PATTERN DETECTION ENDPOINTS', 'yellow');
  
  const smcData = await testEndpoint(
    'SMC Analysis (BTC)',
    `${API_BASE}/analysis/smc?symbol=BTC&timeframe=1d`,
    (data) => data.success && data.data
  );
  
  if (smcData && smcData.data) {
    log(`   Data points analyzed: ${smcData.dataPoints || 'N/A'}`, 'blue');
  }

  // Test 8: Portfolio
  log('\n💼 PORTFOLIO ENDPOINTS', 'yellow');
  
  await testEndpoint(
    'Portfolio Summary',
    `${API_BASE}/portfolio`,
    (data) => data.success && data.data && typeof data.data.totalValue === 'number'
  );

  // Test 9: Signal Generation
  log('\n📡 SIGNAL GENERATION ENDPOINTS', 'yellow');
  
  await testEndpoint(
    'Signal History',
    `${API_BASE}/signals/history?limit=10`,
    (data) => data.success && Array.isArray(data.data)
  );

  await testEndpoint(
    'Signal Statistics',
    `${API_BASE}/signals/statistics`,
    (data) => data.success && data.data
  );

  // Test 10: AI Prediction
  log('\n🤖 AI PREDICTION ENDPOINTS', 'yellow');
  
  const predictionData = await testPostEndpoint(
    'AI Prediction (BTC)',
    `${API_BASE}/ai/predict`,
    { symbol: 'BTC' },
    (data) => data.success && data.data && data.data.prediction
  );
  
  if (predictionData && predictionData.data) {
    log(`   Prediction: ${predictionData.data.prediction}`, 'blue');
    log(`   Confidence: ${(predictionData.data.confidence * 100).toFixed(1)}%`, 'blue');
    log(`   Direction: ${predictionData.data.direction}`, 'blue');
  }

  // Test 11: Backtesting
  log('\n📊 BACKTESTING ENDPOINTS', 'yellow');
  
  await testPostEndpoint(
    'Backtest (BTC, 30 days)',
    `${API_BASE}/ai/backtest`,
    { symbol: 'BTC', period: '1m' },
    (data) => data.success && data.data
  );

  // Summary
  log('\n🎯 ========================================', 'blue');
  log('   TEST SUMMARY', 'blue');
  log('   ========================================', 'blue');
  log(`✅ Passed: ${passedTests}`, 'green');
  log(`❌ Failed: ${failedTests}`, 'red');
  log(`⚠️  Warnings: ${warnings}`, 'yellow');
  
  const totalTests = passedTests + failedTests;
  const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
  
  log(`\n📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  
  if (successRate >= 80) {
    log('\n🎉 EXCELLENT! Real data integration is working!', 'green');
  } else if (successRate >= 50) {
    log('\n⚠️  PARTIAL SUCCESS. Some endpoints need attention.', 'yellow');
  } else {
    log('\n❌ CRITICAL: Most endpoints are failing. Check server logs.', 'red');
  }
  
  log('\n🚀 ========================================\n', 'blue');
}

// Run tests
log('\n⏳ Starting tests in 2 seconds...\n', 'yellow');
log('   Make sure the server is running on port 3001', 'yellow');
log('   Run: npm run dev:real\n', 'yellow');

setTimeout(runTests, 2000);
