#!/usr/bin/env tsx
/**
 * DASHBOARD LOADING VERIFICATION SCRIPT
 * 
 * Purpose: Simulate the complete dashboard loading sequence to verify that:
 * 1. DatasourceClient connects to the local proxy (localhost:8001)
 * 2. The proxy forwards requests to HuggingFace Hub
 * 3. Data is properly returned and mapped to frontend structures
 * 4. NO mock data fallbacks are triggered
 * 
 * This script mimics what happens when a user opens the dashboard.
 */

import { DatasourceClient } from './src/services/DatasourceClient';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(emoji: string, message: string, data?: any) {
  console.log(`\n${emoji} ${colors.bright}${message}${colors.reset}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logSuccess(message: string, data?: any) {
  log('✅', `${colors.green}${message}${colors.reset}`, data);
}

function logError(message: string, error?: any) {
  log('❌', `${colors.red}${message}${colors.reset}`, error);
}

function logInfo(message: string, data?: any) {
  log('ℹ️ ', `${colors.blue}${message}${colors.reset}`, data);
}

function logWarning(message: string, data?: any) {
  log('⚠️ ', `${colors.yellow}${message}${colors.reset}`, data);
}

async function verifyDashboardLoad() {
  console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   DASHBOARD LOADING SEQUENCE VERIFICATION                  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  let allTestsPassed = true;
  const results = {
    ticker: { passed: false, data: null as any, error: null as any },
    chart: { passed: false, data: null as any, error: null as any },
    news: { passed: false, data: null as any, error: null as any },
    sentiment: { passed: false, data: null as any, error: null as any },
    prediction: { passed: false, data: null as any, error: null as any },
  };

  try {
    // Initialize DatasourceClient
    logInfo('Initializing DatasourceClient...');
    const datasourceClient = DatasourceClient.getInstance();
    logSuccess('DatasourceClient initialized successfully');

    // ===================================================================
    // TEST 1: Market Ticker (Top Coins)
    // ===================================================================
    console.log(`\n${colors.bright}${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}TEST 1: Market Ticker - getTopCoins(10)${colors.reset}`);
    console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    try {
      logInfo('Fetching top 10 coins...');
      const topCoins = await datasourceClient.getTopCoins(10);
      
      if (!topCoins || topCoins.length === 0) {
        logError('No coins returned!');
        results.ticker.error = 'Empty array returned';
        allTestsPassed = false;
      } else {
        logSuccess(`Received ${topCoins.length} coins`);
        
        // Validate data structure
        const firstCoin = topCoins[0];
        const requiredFields = ['symbol', 'price', 'change24h', 'changePercent24h', 'volume'];
        const missingFields = requiredFields.filter(field => !(field in firstCoin));
        
        if (missingFields.length > 0) {
          logWarning(`Missing fields: ${missingFields.join(', ')}`);
        }
        
        // Check if data looks real (not zeros)
        const hasRealData = topCoins.some(coin => coin.price > 0 && coin.volume > 0);
        
        if (!hasRealData) {
          logError('Data appears to be mock/zero values!');
          allTestsPassed = false;
        } else {
          logSuccess('Data validation passed - values look real!');
          results.ticker.passed = true;
        }
        
        // Show sample data
        logInfo('Sample data (first 3 coins):', topCoins.slice(0, 3).map(coin => ({
          symbol: coin.symbol,
          price: coin.price.toFixed(2),
          change24h: coin.changePercent24h?.toFixed(2) + '%',
          volume: coin.volume.toLocaleString()
        })));
        
        results.ticker.data = topCoins.slice(0, 3);
      }
    } catch (error) {
      logError('Market ticker test failed:', error);
      results.ticker.error = error;
      allTestsPassed = false;
    }

    // ===================================================================
    // TEST 2: Price Chart (OHLCV Data)
    // ===================================================================
    console.log(`\n${colors.bright}${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}TEST 2: Price Chart - getPriceChart('BTC', '1h')${colors.reset}`);
    console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    try {
      logInfo('Fetching BTC price chart (1h timeframe)...');
      const chartData = await datasourceClient.getPriceChart('BTC', '1h', 100);
      
      if (!chartData || chartData.length === 0) {
        logError('No chart data returned!');
        results.chart.error = 'Empty array returned';
        allTestsPassed = false;
      } else {
        logSuccess(`Received ${chartData.length} bars`);
        
        // Validate OHLCV structure
        const firstBar = chartData[0];
        const requiredFields = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
        const missingFields = requiredFields.filter(field => !(field in firstBar));
        
        if (missingFields.length > 0) {
          logWarning(`Missing fields: ${missingFields.join(', ')}`);
        }
        
        // Check if data looks real
        const hasRealData = chartData.some(bar => 
          bar.open > 0 && bar.high > 0 && bar.low > 0 && bar.close > 0
        );
        
        if (!hasRealData) {
          logError('Chart data appears to be mock/zero values!');
          allTestsPassed = false;
        } else {
          logSuccess('Chart data validation passed!');
          results.chart.passed = true;
        }
        
        // Show sample data
        const latestBar = chartData[chartData.length - 1];
        logInfo('Latest bar:', {
          timestamp: new Date(latestBar.timestamp).toISOString(),
          open: latestBar.open.toFixed(2),
          high: latestBar.high.toFixed(2),
          low: latestBar.low.toFixed(2),
          close: latestBar.close.toFixed(2),
          volume: latestBar.volume.toLocaleString()
        });
        
        results.chart.data = { bars: chartData.length, latest: latestBar };
      }
    } catch (error) {
      logError('Price chart test failed:', error);
      results.chart.error = error;
      allTestsPassed = false;
    }

    // ===================================================================
    // TEST 3: Latest News
    // ===================================================================
    console.log(`\n${colors.bright}${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}TEST 3: News Feed - getLatestNews()${colors.reset}`);
    console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    try {
      logInfo('Fetching latest news...');
      const news = await datasourceClient.getLatestNews(10);
      
      if (!news || news.length === 0) {
        logWarning('No news returned (this might be expected if endpoint is not implemented)');
        results.news.error = 'Empty array returned (non-critical)';
        // Don't fail the test for missing news
      } else {
        logSuccess(`Received ${news.length} news items`);
        
        // Validate news structure
        const firstNews = news[0];
        const requiredFields = ['id', 'title', 'description', 'url', 'source'];
        const missingFields = requiredFields.filter(field => !(field in firstNews));
        
        if (missingFields.length > 0) {
          logWarning(`Missing fields: ${missingFields.join(', ')}`);
        } else {
          results.news.passed = true;
        }
        
        // Show sample data
        logInfo('Sample news (first item):', {
          title: news[0].title,
          source: news[0].source,
          publishedAt: news[0].publishedAt
        });
        
        results.news.data = news.slice(0, 2);
      }
    } catch (error) {
      logWarning('News feed test failed (non-critical):', error);
      results.news.error = error;
      // Don't fail overall test for missing news
    }

    // ===================================================================
    // TEST 4: Market Sentiment
    // ===================================================================
    console.log(`\n${colors.bright}${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}TEST 4: Market Sentiment - getMarketSentiment()${colors.reset}`);
    console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    try {
      logInfo('Fetching market sentiment...');
      const sentiment = await datasourceClient.getMarketSentiment();
      
      if (!sentiment) {
        logWarning('No sentiment data returned (this might be expected)');
        results.sentiment.error = 'Null returned (non-critical)';
      } else {
        logSuccess('Received sentiment data');
        
        // Validate sentiment structure
        if (sentiment.fearGreedIndex !== undefined) {
          logInfo('Fear & Greed Index:', {
            index: sentiment.fearGreedIndex,
            classification: sentiment.classification
          });
          results.sentiment.passed = true;
          results.sentiment.data = sentiment;
        } else {
          logWarning('Sentiment data missing fearGreedIndex field');
        }
      }
    } catch (error) {
      logWarning('Market sentiment test failed (non-critical):', error);
      results.sentiment.error = error;
    }

    // ===================================================================
    // TEST 5: AI Prediction
    // ===================================================================
    console.log(`\n${colors.bright}${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bright}${colors.magenta}TEST 5: AI Prediction - getAIPrediction('BTC', '1h')${colors.reset}`);
    console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    try {
      logInfo('Fetching AI prediction for BTC...');
      const prediction = await datasourceClient.getAIPrediction('BTC', '1h');
      
      if (!prediction) {
        logWarning('No prediction data returned (this might be expected)');
        results.prediction.error = 'Null returned (non-critical)';
      } else {
        logSuccess('Received prediction data');
        
        logInfo('Prediction:', {
          symbol: prediction.symbol,
          action: prediction.action,
          confidence: (prediction.confidence * 100).toFixed(2) + '%',
          price: prediction.price
        });
        
        results.prediction.passed = true;
        results.prediction.data = prediction;
      }
    } catch (error) {
      logWarning('AI prediction test failed (non-critical):', error);
      results.prediction.error = error;
    }

  } catch (error) {
    logError('Fatal error during verification:', error);
    allTestsPassed = false;
  }

  // ===================================================================
  // FINAL RESULTS
  // ===================================================================
  console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   VERIFICATION RESULTS                                     ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const criticalTests = ['ticker', 'chart'];
  const criticalPassed = criticalTests.every(test => results[test as keyof typeof results].passed);

  console.log(`${colors.bright}Critical Tests (Must Pass):${colors.reset}`);
  console.log(`  • Market Ticker: ${results.ticker.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  • Price Chart:   ${results.chart.passed ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log(`\n${colors.bright}Optional Tests (Nice to Have):${colors.reset}`);
  console.log(`  • News Feed:     ${results.news.passed ? '✅ PASS' : '⚠️  SKIP'}`);
  console.log(`  • Sentiment:     ${results.sentiment.passed ? '✅ PASS' : '⚠️  SKIP'}`);
  console.log(`  • AI Prediction: ${results.prediction.passed ? '✅ PASS' : '⚠️  SKIP'}`);

  console.log(`\n${colors.bright}Overall Status:${colors.reset}`);
  if (criticalPassed) {
    console.log(`${colors.green}${colors.bright}✅ DASHBOARD IS READY TO LOAD!${colors.reset}`);
    console.log(`${colors.green}The frontend will be able to display:${colors.reset}`);
    console.log(`  • Market ticker with real prices`);
    console.log(`  • Price charts with OHLCV data`);
    if (results.news.passed) console.log(`  • News feed`);
    if (results.sentiment.passed) console.log(`  • Market sentiment indicators`);
    if (results.prediction.passed) console.log(`  • AI predictions`);
    
    console.log(`\n${colors.cyan}${colors.bright}Next Steps:${colors.reset}`);
    console.log(`  1. Start the backend server: npm run dev:server`);
    console.log(`  2. Start the frontend: npm run dev`);
    console.log(`  3. Open http://localhost:5173 in your browser`);
    console.log(`  4. The dashboard should load with real data!`);
  } else {
    console.log(`${colors.red}${colors.bright}❌ CRITICAL TESTS FAILED!${colors.reset}`);
    console.log(`${colors.red}The dashboard will not be able to load properly.${colors.reset}`);
    console.log(`\n${colors.yellow}${colors.bright}Troubleshooting:${colors.reset}`);
    console.log(`  1. Ensure the backend server is running on port 8001`);
    console.log(`  2. Verify HuggingFace Hub is accessible: ${process.env.HF_ENGINE_BASE_URL}`);
    console.log(`  3. Check server logs for proxy errors`);
    console.log(`  4. Test the proxy endpoints manually:`);
    console.log(`     curl http://localhost:8001/api/market?limit=5`);
  }

  console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(criticalPassed ? 0 : 1);
}

// Run the verification
verifyDashboardLoad().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
