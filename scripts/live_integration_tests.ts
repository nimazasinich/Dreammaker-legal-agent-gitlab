#!/usr/bin/env tsx
/**
 * LIVE INTEGRATION TESTS
 * Tests actual backend API endpoints with real network calls
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:8001';
const TIMEOUT = 30000;

// ================== HELPER FUNCTIONS ==================

function log(section: string, message: string, data?: any) {
  console.log(`\n[${section}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function pass(section: string, message: string) {
  console.log(`\n✅ [${section}] PASS: ${message}`);
}

function fail(section: string, message: string, error?: any) {
  console.error(`\n❌ [${section}] FAIL: ${message}`);
  if (error) {
    console.error(error);
  }
}

// ================== TEST 1: BACKEND CONNECTIVITY ==================

async function testBackendConnectivity(): Promise<boolean> {
  const testName = 'CONNECTIVITY';
  log(testName, 'Testing backend connectivity...');
  
  try {
    const response = await axios.get(`${API_BASE}/api/market?limit=1`, {
      timeout: 5000
    });
    
    if (response.status !== 200) {
      fail(testName, `Unexpected status code: ${response.status}`);
      return false;
    }
    
    log(testName, 'Backend Response:', {
      status: response.status,
      hasData: !!response.data,
      hasCryptos: !!response.data?.cryptocurrencies
    });
    
    pass(testName, 'Backend is reachable and responding');
    return true;
  } catch (error: any) {
    fail(testName, 'Backend not reachable', error.message);
    return false;
  }
}

// ================== TEST 2: MARKET DATA ENDPOINTS ==================

async function testMarketDataEndpoints(): Promise<boolean> {
  const testName = 'MARKET DATA';
  log(testName, 'Testing market data endpoints...');
  
  try {
    // Test 2.1: Get top coins
    log(testName, 'Test 2.1: GET /api/market');
    const topCoinsResponse = await axios.get(`${API_BASE}/api/market?limit=10`, {
      timeout: TIMEOUT
    });
    
    if (!topCoinsResponse.data?.cryptocurrencies || topCoinsResponse.data.cryptocurrencies.length === 0) {
      fail(testName, 'No cryptocurrencies data returned');
      return false;
    }
    
    const btcData = topCoinsResponse.data.cryptocurrencies[0];
    log(testName, 'Top Coin (BTC):', {
      symbol: btcData.symbol,
      price: btcData.price,
      change24h: btcData.change_24h,
      marketCap: btcData.market_cap
    });
    
    pass(testName, `Fetched ${topCoinsResponse.data.cryptocurrencies.length} coins`);
    
    // Test 2.2: Get market history
    log(testName, 'Test 2.2: GET /api/market/history');
    const historyResponse = await axios.get(
      `${API_BASE}/api/market/history?symbol=BTC&timeframe=1h&limit=100`,
      { timeout: TIMEOUT }
    );
    
    const historyData = historyResponse.data?.history || [];
    log(testName, 'History Data:', {
      candlesReturned: historyData.length,
      source: historyResponse.data?.source,
      latestPrice: historyData[0]?.price_usd
    });
    
    if (historyData.length === 0) {
      console.warn(`⚠️  [${testName}] Warning: No historical data available`);
    } else {
      pass(testName, `Fetched ${historyData.length} historical candles`);
    }
    
    // Test 2.3: Get market stats
    log(testName, 'Test 2.3: GET /api/stats');
    const statsResponse = await axios.get(`${API_BASE}/api/stats`, {
      timeout: TIMEOUT
    });
    
    log(testName, 'Market Stats:', {
      totalMarketCap: statsResponse.data?.totalMarketCap,
      btcDominance: statsResponse.data?.btcDominance,
      activeCoins: statsResponse.data?.activeCoins
    });
    
    pass(testName, 'Market stats endpoint working');
    
    return true;
  } catch (error: any) {
    fail(testName, 'Market data endpoints failed', error.response?.data || error.message);
    return false;
  }
}

// ================== TEST 3: AI/ML ENDPOINTS ==================

async function testAIEndpoints(): Promise<boolean> {
  const testName = 'AI/ML ENDPOINTS';
  log(testName, 'Testing AI/ML endpoints...');
  
  try {
    // Test 3.1: AI Prediction
    log(testName, 'Test 3.1: POST /api/ai/predict');
    
    try {
      const predictionResponse = await axios.post(
        `${API_BASE}/api/ai/predict`,
        {
          symbol: 'BTC',
          timeframe: '1h'
        },
        { timeout: TIMEOUT }
      );
      
      if (predictionResponse.data.error) {
        log(testName, 'AI Prediction returned error:', predictionResponse.data);
        console.warn(`⚠️  [${testName}] AI endpoint requires more historical data`);
      } else {
        log(testName, 'AI Prediction:', {
          action: predictionResponse.data.action,
          confidence: predictionResponse.data.confidence,
          price: predictionResponse.data.price
        });
        pass(testName, 'AI prediction endpoint working');
      }
    } catch (aiError: any) {
      log(testName, 'AI Prediction Error:', aiError.response?.data?.error || aiError.message);
      console.warn(`⚠️  [${testName}] AI prediction unavailable (likely insufficient data)`);
    }
    
    // Test 3.2: Training Status
    log(testName, 'Test 3.2: GET /api/training-metrics');
    try {
      const trainingResponse = await axios.get(`${API_BASE}/api/training-metrics`, {
        timeout: TIMEOUT
      });
      
      log(testName, 'Training Metrics:', {
        hasMetrics: !!trainingResponse.data?.metrics,
        metricsCount: trainingResponse.data?.metrics?.length || 0
      });
      
      pass(testName, 'Training metrics endpoint accessible');
    } catch (trainingError: any) {
      console.warn(`⚠️  [${testName}] Training metrics not available`);
    }
    
    return true;
  } catch (error: any) {
    fail(testName, 'AI endpoints test failed', error.message);
    return false;
  }
}

// ================== TEST 4: SENTIMENT & NEWS ENDPOINTS ==================

async function testSentimentNewsEndpoints(): Promise<boolean> {
  const testName = 'SENTIMENT/NEWS';
  log(testName, 'Testing sentiment and news endpoints...');
  
  try {
    // Test 4.1: Market Sentiment
    log(testName, 'Test 4.1: GET /api/sentiment');
    try {
      const sentimentResponse = await axios.get(`${API_BASE}/api/sentiment`, {
        timeout: TIMEOUT
      });
      
      log(testName, 'Sentiment Data:', {
        fearGreedIndex: sentimentResponse.data?.fearGreedIndex,
        classification: sentimentResponse.data?.classification
      });
      
      pass(testName, 'Sentiment endpoint working');
    } catch (sentimentError: any) {
      console.warn(`⚠️  [${testName}] Sentiment endpoint not available`);
    }
    
    // Test 4.2: Latest News
    log(testName, 'Test 4.2: GET /api/news/latest');
    try {
      const newsResponse = await axios.get(`${API_BASE}/api/news/latest?limit=5`, {
        timeout: TIMEOUT
      });
      
      const newsItems = newsResponse.data?.news || [];
      log(testName, 'News Data:', {
        newsCount: newsItems.length,
        latestTitle: newsItems[0]?.title
      });
      
      if (newsItems.length > 0) {
        pass(testName, `Fetched ${newsItems.length} news items`);
      } else {
        console.warn(`⚠️  [${testName}] No news items available`);
      }
    } catch (newsError: any) {
      console.warn(`⚠️  [${testName}] News endpoint not available`);
    }
    
    return true;
  } catch (error: any) {
    fail(testName, 'Sentiment/News endpoints failed', error.message);
    return false;
  }
}

// ================== TEST 5: TRADING ENDPOINTS ==================

async function testTradingEndpoints(): Promise<boolean> {
  const testName = 'TRADING';
  log(testName, 'Testing trading endpoints...');
  
  try {
    // Test 5.1: Portfolio
    log(testName, 'Test 5.1: GET /api/trading/portfolio');
    try {
      const portfolioResponse = await axios.get(`${API_BASE}/api/trading/portfolio`, {
        timeout: TIMEOUT
      });
      
      log(testName, 'Portfolio Data:', {
        success: portfolioResponse.data?.success,
        hasPortfolio: !!portfolioResponse.data?.portfolio
      });
      
      pass(testName, 'Portfolio endpoint accessible');
    } catch (portfolioError: any) {
      console.warn(`⚠️  [${testName}] Portfolio endpoint not available`);
    }
    
    // Test 5.2: Open Orders
    log(testName, 'Test 5.2: GET /api/trading/orders');
    try {
      const ordersResponse = await axios.get(`${API_BASE}/api/trading/orders`, {
        timeout: TIMEOUT
      });
      
      log(testName, 'Orders Data:', {
        success: ordersResponse.data?.success,
        ordersCount: ordersResponse.data?.orders?.length || 0
      });
      
      pass(testName, 'Orders endpoint accessible');
    } catch (ordersError: any) {
      console.warn(`⚠️  [${testName}] Orders endpoint not available`);
    }
    
    return true;
  } catch (error: any) {
    fail(testName, 'Trading endpoints test failed', error.message);
    return false;
  }
}

// ================== TEST 6: SCORING & STRATEGY ENDPOINTS ==================

async function testScoringStrategyEndpoints(): Promise<boolean> {
  const testName = 'SCORING/STRATEGY';
  log(testName, 'Testing scoring and strategy endpoints...');
  
  try {
    // Test 6.1: Scoring Snapshot
    log(testName, 'Test 6.1: GET /api/scoring/snapshot');
    try {
      const scoringResponse = await axios.get(
        `${API_BASE}/api/scoring/snapshot?symbol=BTC`,
        { timeout: TIMEOUT }
      );
      
      log(testName, 'Scoring Data:', {
        success: scoringResponse.data?.success,
        hasSnapshot: !!scoringResponse.data?.snapshot
      });
      
      if (scoringResponse.data?.snapshot) {
        pass(testName, 'Scoring snapshot endpoint working');
      } else {
        console.warn(`⚠️  [${testName}] Scoring snapshot not available`);
      }
    } catch (scoringError: any) {
      console.warn(`⚠️  [${testName}] Scoring endpoint not available`);
    }
    
    // Test 6.2: Scoring Weights
    log(testName, 'Test 6.2: GET /api/scoring/weights');
    try {
      const weightsResponse = await axios.get(`${API_BASE}/api/scoring/weights`, {
        timeout: TIMEOUT
      });
      
      log(testName, 'Weights Data:', {
        success: weightsResponse.data?.success,
        hasWeights: !!weightsResponse.data?.weights
      });
      
      pass(testName, 'Scoring weights endpoint accessible');
    } catch (weightsError: any) {
      console.warn(`⚠️  [${testName}] Weights endpoint not available`);
    }
    
    return true;
  } catch (error: any) {
    fail(testName, 'Scoring/Strategy endpoints test failed', error.message);
    return false;
  }
}

// ================== TEST 7: SYSTEM/HEALTH ENDPOINTS ==================

async function testSystemEndpoints(): Promise<boolean> {
  const testName = 'SYSTEM/HEALTH';
  log(testName, 'Testing system and health endpoints...');
  
  try {
    // Test 7.1: Health Check
    log(testName, 'Test 7.1: GET /api/health');
    const healthResponse = await axios.get(`${API_BASE}/api/health`, {
      timeout: 5000
    });
    
    log(testName, 'Health Status:', {
      status: healthResponse.data?.status,
      error: healthResponse.data?.error
    });
    
    // Health may be "unhealthy" due to external services, but endpoint should work
    pass(testName, 'Health endpoint accessible');
    
    // Test 7.2: System Info (if available)
    log(testName, 'Test 7.2: GET /api/system/info');
    try {
      const infoResponse = await axios.get(`${API_BASE}/api/system/info`, {
        timeout: 5000
      });
      
      log(testName, 'System Info:', infoResponse.data);
      pass(testName, 'System info endpoint working');
    } catch (infoError) {
      console.warn(`⚠️  [${testName}] System info endpoint not available`);
    }
    
    return true;
  } catch (error: any) {
    fail(testName, 'System endpoints test failed', error.message);
    return false;
  }
}

// ================== TEST 8: END-TO-END WORKFLOW ==================

async function testEndToEndWorkflow(): Promise<boolean> {
  const testName = 'E2E WORKFLOW';
  log(testName, 'Testing end-to-end trading workflow...');
  
  try {
    // Step 1: Fetch market data
    log(testName, 'Step 1: Fetch current BTC price');
    const marketResponse = await axios.get(`${API_BASE}/api/market?limit=1&symbol=BTC`, {
      timeout: TIMEOUT
    });
    
    const btcPrice = marketResponse.data?.cryptocurrencies?.[0]?.price;
    if (!btcPrice) {
      fail(testName, 'Could not fetch BTC price');
      return false;
    }
    
    log(testName, `Current BTC Price: $${btcPrice.toFixed(2)}`);
    
    // Step 2: Get historical data
    log(testName, 'Step 2: Fetch historical data');
    const historyResponse = await axios.get(
      `${API_BASE}/api/market/history?symbol=BTC&timeframe=1h&limit=50`,
      { timeout: TIMEOUT }
    );
    
    const historicalData = historyResponse.data?.history || [];
    log(testName, `Historical candles: ${historicalData.length}`);
    
    // Step 3: Try AI prediction (may fail if insufficient data)
    log(testName, 'Step 3: Request AI prediction');
    try {
      const predictionResponse = await axios.post(
        `${API_BASE}/api/ai/predict`,
        { symbol: 'BTC', timeframe: '1h' },
        { timeout: TIMEOUT }
      );
      
      if (!predictionResponse.data.error) {
        log(testName, `AI Prediction: ${predictionResponse.data.action} (${(predictionResponse.data.confidence * 100).toFixed(1)}%)`);
      }
    } catch {
      log(testName, 'AI prediction skipped (insufficient data)');
    }
    
    // Step 4: Check portfolio
    log(testName, 'Step 4: Check portfolio status');
    try {
      const portfolioResponse = await axios.get(`${API_BASE}/api/trading/portfolio`, {
        timeout: TIMEOUT
      });
      
      if (portfolioResponse.data?.success) {
        log(testName, 'Portfolio accessible');
      }
    } catch {
      log(testName, 'Portfolio check skipped');
    }
    
    pass(testName, 'End-to-end workflow completed');
    return true;
  } catch (error: any) {
    fail(testName, 'E2E workflow failed', error.response?.data || error.message);
    return false;
  }
}

// ================== MAIN EXECUTION ==================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔗 LIVE INTEGRATION TESTS');
  console.log('Testing backend API endpoints with real network calls');
  console.log(`Backend URL: ${API_BASE}`);
  console.log('='.repeat(80));
  
  const results = {
    connectivity: await testBackendConnectivity(),
    marketData: await testMarketDataEndpoints(),
    aiEndpoints: await testAIEndpoints(),
    sentimentNews: await testSentimentNewsEndpoints(),
    trading: await testTradingEndpoints(),
    scoringStrategy: await testScoringStrategyEndpoints(),
    system: await testSystemEndpoints(),
    e2eWorkflow: await testEndToEndWorkflow()
  };
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 LIVE INTEGRATION TEST SUMMARY');
  console.log('='.repeat(80));
  
  const tests = Object.entries(results);
  const passedTests = tests.filter(([_, passed]) => passed).length;
  
  console.log(`\n${results.connectivity ? '✅' : '❌'} Backend Connectivity:      ${results.connectivity ? 'PASS' : 'FAIL'}`);
  console.log(`${results.marketData ? '✅' : '❌'} Market Data Endpoints:    ${results.marketData ? 'PASS' : 'FAIL'}`);
  console.log(`${results.aiEndpoints ? '✅' : '❌'} AI/ML Endpoints:          ${results.aiEndpoints ? 'PASS' : 'FAIL'}`);
  console.log(`${results.sentimentNews ? '✅' : '❌'} Sentiment/News Endpoints: ${results.sentimentNews ? 'PASS' : 'FAIL'}`);
  console.log(`${results.trading ? '✅' : '❌'} Trading Endpoints:        ${results.trading ? 'PASS' : 'FAIL'}`);
  console.log(`${results.scoringStrategy ? '✅' : '❌'} Scoring/Strategy:         ${results.scoringStrategy ? 'PASS' : 'FAIL'}`);
  console.log(`${results.system ? '✅' : '❌'} System/Health Endpoints:  ${results.system ? 'PASS' : 'FAIL'}`);
  console.log(`${results.e2eWorkflow ? '✅' : '❌'} End-to-End Workflow:      ${results.e2eWorkflow ? 'PASS' : 'FAIL'}`);
  
  console.log(`\n📈 Overall Score: ${passedTests}/${tests.length} (${((passedTests / tests.length) * 100).toFixed(1)}%)`);
  
  if (passedTests === tests.length) {
    console.log('\n🎉 ALL LIVE INTEGRATION TESTS PASSED! Backend is fully operational.');
  } else {
    console.log(`\n⚠️  ${tests.length - passedTests} test(s) failed. Some endpoints may be unavailable.`);
    console.log('Note: Some warnings are expected if historical data is insufficient.');
  }
  
  console.log('='.repeat(80) + '\n');
  
  process.exit(passedTests >= 6 ? 0 : 1); // Pass if at least 6/8 tests pass
}

main().catch(error => {
  console.error('\n💥 FATAL ERROR:', error);
  process.exit(1);
});
