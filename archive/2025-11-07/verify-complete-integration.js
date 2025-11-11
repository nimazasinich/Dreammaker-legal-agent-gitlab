/**
 * COMPLETE REAL DATA INTEGRATION VERIFICATION
 * Tests all real data sources and component connections
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, url, method = 'GET', data = null) {
  try {
    const config = { method, url: `${API_BASE}${url}`, timeout: 15000 };
    if (data) config.data = data;
    
    const start = Date.now();
    const response = await axios(config);
    const duration = Date.now() - start;
    
    if (response.data && response.data.success !== false) {
      log(`✅ ${name} - ${duration}ms`, 'green');
      return { success: true, data: response.data, duration };
    } else {
      log(`⚠️  ${name} - Returned error: ${response.data.error || 'Unknown'}`, 'yellow');
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    log(`❌ ${name} - ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runVerification() {
  log('\n🚀 ========================================', 'blue');
  log('   BOLT AI - REAL DATA INTEGRATION TEST', 'blue');
  log('   ========================================\n', 'blue');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };

  // 1. Health Check
  log('\n📊 1. SYSTEM HEALTH CHECK', 'blue');
  const health = await testEndpoint('Health Check', '/health');
  results.tests.push({ name: 'Health Check', ...health });
  if (health.success) results.passed++; else results.failed++;

  // 2. Market Data Tests
  log('\n💰 2. REAL MARKET DATA SOURCES', 'blue');
  
  const pricesTest = await testEndpoint('Multi-Symbol Prices', '/market/prices?symbols=BTC,ETH,SOL');
  results.tests.push({ name: 'Market Prices', ...pricesTest });
  if (pricesTest.success) {
    results.passed++;
    if (pricesTest.data.prices && pricesTest.data.prices.length > 0) {
      log(`   📈 Fetched ${pricesTest.data.prices.length} prices`, 'green');
      pricesTest.data.prices.forEach(p => {
        log(`      ${p.symbol}: $${p.price?.toFixed(2) || 'N/A'} (${p.source || 'unknown'})`, 'green');
      });
    }
  } else {
    results.failed++;
  }

  const ohlcvTest = await testEndpoint('Historical OHLCV', '/hf/ohlcv?symbol=BTC&days=30');
  results.tests.push({ name: 'Historical Data', ...ohlcvTest });
  if (ohlcvTest.success) {
    results.passed++;
    if (ohlcvTest.data.data) {
      log(`   📊 Fetched ${ohlcvTest.data.data.length} historical data points`, 'green');
    }
  } else {
    results.failed++;
  }

  // 3. Blockchain Data Tests
  log('\n⛓️  3. BLOCKCHAIN DATA SOURCES', 'blue');
  
  // Test with Vitalik's address
  const ethAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  const balanceTest = await testEndpoint(
    'Ethereum Balance', 
    `/blockchain/balances/${ethAddress}?network=ethereum`
  );
  results.tests.push({ name: 'Blockchain Balance', ...balanceTest });
  if (balanceTest.success) {
    results.passed++;
    if (balanceTest.data.data) {
      log(`   💎 Balance: ${balanceTest.data.data.balanceFormatted?.toFixed(4) || 'N/A'} ETH`, 'green');
    }
  } else {
    results.failed++;
  }

  // 4. Sentiment Data Tests
  log('\n😊 4. SENTIMENT DATA SOURCES', 'blue');
  
  const fearGreedTest = await testEndpoint('Fear & Greed Index', '/sentiment/fear-greed');
  results.tests.push({ name: 'Fear & Greed', ...fearGreedTest });
  if (fearGreedTest.success) {
    results.passed++;
    if (fearGreedTest.data.data) {
      log(`   📊 F&G: ${fearGreedTest.data.data.value} (${fearGreedTest.data.data.classification})`, 'green');
    }
  } else {
    results.failed++;
  }

  // 5. News Data Tests
  log('\n📰 5. NEWS DATA SOURCES', 'blue');
  
  const newsTest = await testEndpoint('Latest News', '/news/latest?limit=10');
  results.tests.push({ name: 'Crypto News', ...newsTest });
  if (newsTest.success) {
    results.passed++;
    if (newsTest.data.data && newsTest.data.data.length > 0) {
      log(`   📰 Fetched ${newsTest.data.data.length} news items`, 'green');
    }
  } else {
    results.failed++;
  }

  // 6. Pattern Detection Tests
  log('\n🔍 6. PATTERN DETECTION (Real Data)', 'blue');
  
  const smcTest = await testEndpoint('SMC Analysis', '/analysis/smc?symbol=BTC&timeframe=1d');
  results.tests.push({ name: 'SMC Patterns', ...smcTest });
  if (smcTest.success) {
    results.passed++;
    if (smcTest.data.data) {
      log(`   🎯 Detected patterns using ${smcTest.data.dataPoints || 0} real data points`, 'green');
    }
  } else {
    results.failed++;
  }

  // 7. AI Prediction Tests
  log('\n🤖 7. AI PREDICTION ENGINE', 'blue');
  
  const predictionTest = await testEndpoint(
    'AI Prediction', 
    '/ai/predict', 
    'POST', 
    { symbol: 'BTC' }
  );
  results.tests.push({ name: 'AI Prediction', ...predictionTest });
  if (predictionTest.success) {
    results.passed++;
    if (predictionTest.data.data) {
      const pred = predictionTest.data.data;
      log(`   🎯 Prediction: ${pred.direction} (${(pred.confidence * 100).toFixed(1)}% confidence)`, 'green');
    }
  } else {
    results.failed++;
  }

  // 8. Signal Generation Tests
  log('\n📡 8. SIGNAL GENERATION', 'blue');
  
  const signalsTest = await testEndpoint('Signal History', '/signals/history?limit=10');
  results.tests.push({ name: 'Trading Signals', ...signalsTest });
  if (signalsTest.success) {
    results.passed++;
    if (signalsTest.data.data) {
      log(`   📊 Retrieved ${signalsTest.data.data.length} signals`, 'green');
    }
  } else {
    results.failed++;
  }

  const signalStatsTest = await testEndpoint('Signal Statistics', '/signals/statistics');
  results.tests.push({ name: 'Signal Stats', ...signalStatsTest });
  if (signalStatsTest.success) results.passed++; else results.failed++;

  // 9. Portfolio Tests
  log('\n💼 9. PORTFOLIO TRACKING', 'blue');
  
  const portfolioTest = await testEndpoint('Portfolio Data', '/portfolio');
  results.tests.push({ name: 'Portfolio', ...portfolioTest });
  if (portfolioTest.success) {
    results.passed++;
    if (portfolioTest.data.data) {
      log(`   💰 Total Value: $${portfolioTest.data.data.totalValue?.toFixed(2) || '0.00'}`, 'green');
    }
  } else {
    results.failed++;
  }

  // 10. Whale Tracking Tests
  log('\n🐋 10. WHALE TRACKING', 'blue');
  
  const whaleTest = await testEndpoint('Whale Transactions', '/whale/transactions?symbol=BTCUSDT');
  results.tests.push({ name: 'Whale Activity', ...whaleTest });
  if (whaleTest.success) {
    results.passed++;
    if (whaleTest.data.data) {
      log(`   🐋 Tracked ${whaleTest.data.data.length || 0} whale transactions`, 'green');
    }
  } else {
    results.failed++;
  }

  // Summary
  log('\n📊 ========================================', 'blue');
  log('   VERIFICATION SUMMARY', 'blue');
  log('   ========================================', 'blue');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⚠️  Warnings: ${results.warnings}`, 'yellow');
  
  const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
  log(`\n📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');

  if (results.failed === 0) {
    log('\n🎉 ALL TESTS PASSED! System is 100% operational with real data!', 'green');
  } else if (successRate >= 80) {
    log('\n✅ System is mostly operational. Some endpoints may need attention.', 'yellow');
  } else {
    log('\n⚠️  System has significant issues. Please check failed endpoints.', 'red');
  }

  log('\n========================================\n', 'blue');

  return results;
}

// Run verification
runVerification()
  .then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    log(`\n❌ Verification failed: ${error.message}`, 'red');
    process.exit(1);
  });
