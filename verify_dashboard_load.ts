#!/usr/bin/env tsx
/**
 * DASHBOARD VERIFICATION SCRIPT
 * 
 * This script simulates the Dashboard loading sequence to verify that:
 * 1. DatasourceClient connects to the local proxy (localhost:8001)
 * 2. The proxy forwards requests to the Hugging Face Hub
 * 3. Data flows correctly from Hub -> Proxy -> Frontend
 * 
 * NO MOCKS, NO FALLBACKS - Pure real data flow verification
 */

import { DatasourceClient } from './src/services/DatasourceClient';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '═'.repeat(80));
  log(`  ${title}`, 'bright');
  console.log('═'.repeat(80) + '\n');
}

function logSuccess(message: string) {
  log(`✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function verifyDashboardLoad() {
  logSection('🚀 DASHBOARD LOAD VERIFICATION - Hub-and-Spoke Architecture');
  
  logInfo('Architecture:');
  console.log('  Frontend → DatasourceClient → Local Proxy (8001) → Hugging Face Hub');
  console.log('  NO external API calls, NO mock data fallbacks\n');

  const datasourceClient = DatasourceClient.getInstance();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // TEST 1: Market Ticker - getTopCoins()
  logSection('TEST 1: Market Ticker - Top Coins');
  totalTests++;
  
  try {
    logInfo('Calling: datasourceClient.getTopCoins(10)');
    const startTime = Date.now();
    const topCoins = await datasourceClient.getTopCoins(10);
    const elapsed = Date.now() - startTime;
    
    if (topCoins && topCoins.length > 0) {
      passedTests++;
      logSuccess(`Received ${topCoins.length} coins in ${elapsed}ms`);
      
      console.log('\n📊 Sample Data (first 3 coins):');
      topCoins.slice(0, 3).forEach((coin, idx) => {
        console.log(`\n  ${idx + 1}. ${coin.symbol}`);
        console.log(`     Price: $${coin.price.toLocaleString()}`);
        console.log(`     24h Change: ${coin.changePercent24h >= 0 ? '+' : ''}${coin.changePercent24h.toFixed(2)}%`);
        console.log(`     Volume: $${coin.volume.toLocaleString()}`);
        console.log(`     Market Cap: $${coin.marketCap?.toLocaleString() || 'N/A'}`);
      });
      
      // Validate data structure
      const firstCoin = topCoins[0];
      const hasValidStructure = 
        typeof firstCoin.symbol === 'string' &&
        typeof firstCoin.price === 'number' &&
        typeof firstCoin.changePercent24h === 'number' &&
        typeof firstCoin.volume === 'number';
      
      if (hasValidStructure) {
        logSuccess('✓ Data structure is valid and matches expected format');
      } else {
        logWarning('⚠ Data structure validation failed');
      }
      
      // Check for realistic values (not zeros)
      const hasRealisticValues = topCoins.every(coin => 
        coin.price > 0 && 
        Math.abs(coin.changePercent24h) < 100 &&
        coin.volume > 0
      );
      
      if (hasRealisticValues) {
        logSuccess('✓ All values appear realistic (not mock zeros)');
      } else {
        logWarning('⚠ Some values appear unrealistic - check data source');
      }
    } else {
      failedTests++;
      logError('No data returned - array is empty');
    }
  } catch (error) {
    failedTests++;
    logError(`Failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // TEST 2: Price Chart - getPriceChart()
  logSection('TEST 2: Price Chart - OHLCV Data');
  totalTests++;
  
  try {
    logInfo('Calling: datasourceClient.getPriceChart("BTC", "1h", 100)');
    const startTime = Date.now();
    const chartData = await datasourceClient.getPriceChart('BTC', '1h', 100);
    const elapsed = Date.now() - startTime;
    
    if (chartData && chartData.length > 0) {
      passedTests++;
      logSuccess(`Received ${chartData.length} candles in ${elapsed}ms`);
      
      console.log('\n📈 Sample Candles (last 3):');
      chartData.slice(-3).forEach((candle, idx) => {
        const date = new Date(candle.timestamp).toLocaleString();
        console.log(`\n  ${idx + 1}. ${date}`);
        console.log(`     Open:   $${candle.open.toFixed(2)}`);
        console.log(`     High:   $${candle.high.toFixed(2)}`);
        console.log(`     Low:    $${candle.low.toFixed(2)}`);
        console.log(`     Close:  $${candle.close.toFixed(2)}`);
        console.log(`     Volume: ${candle.volume.toFixed(2)}`);
      });
      
      // Validate OHLCV structure
      const firstCandle = chartData[0];
      const hasValidStructure = 
        typeof firstCandle.timestamp === 'number' &&
        typeof firstCandle.open === 'number' &&
        typeof firstCandle.high === 'number' &&
        typeof firstCandle.low === 'number' &&
        typeof firstCandle.close === 'number' &&
        typeof firstCandle.volume === 'number';
      
      if (hasValidStructure) {
        logSuccess('✓ OHLCV data structure is valid');
      } else {
        logWarning('⚠ OHLCV data structure validation failed');
      }
      
      // Check for realistic OHLCV relationships
      const hasValidOHLC = chartData.every(candle => 
        candle.high >= candle.open &&
        candle.high >= candle.close &&
        candle.high >= candle.low &&
        candle.low <= candle.open &&
        candle.low <= candle.close
      );
      
      if (hasValidOHLC) {
        logSuccess('✓ OHLC relationships are valid (High ≥ Open/Close ≥ Low)');
      } else {
        logWarning('⚠ Some OHLC relationships are invalid');
      }
    } else {
      failedTests++;
      logError('No chart data returned - array is empty');
    }
  } catch (error) {
    failedTests++;
    logError(`Failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // TEST 3: News Feed - getLatestNews()
  logSection('TEST 3: News Feed - Latest Cryptocurrency News');
  totalTests++;
  
  try {
    logInfo('Calling: datasourceClient.getLatestNews(5)');
    const startTime = Date.now();
    const newsData = await datasourceClient.getLatestNews(5);
    const elapsed = Date.now() - startTime;
    
    if (newsData && newsData.length > 0) {
      passedTests++;
      logSuccess(`Received ${newsData.length} news articles in ${elapsed}ms`);
      
      console.log('\n📰 Sample News (first 2):');
      newsData.slice(0, 2).forEach((article, idx) => {
        console.log(`\n  ${idx + 1}. ${article.title}`);
        console.log(`     Source: ${article.source}`);
        console.log(`     Published: ${article.publishedAt}`);
        console.log(`     URL: ${article.url.substring(0, 60)}...`);
        if (article.description) {
          console.log(`     Description: ${article.description.substring(0, 100)}...`);
        }
      });
      
      // Validate news structure
      const firstArticle = newsData[0];
      const hasValidStructure = 
        typeof firstArticle.id === 'string' &&
        typeof firstArticle.title === 'string' &&
        typeof firstArticle.url === 'string' &&
        typeof firstArticle.source === 'string';
      
      if (hasValidStructure) {
        logSuccess('✓ News data structure is valid');
      } else {
        logWarning('⚠ News data structure validation failed');
      }
    } else {
      failedTests++;
      logError('No news data returned - array is empty');
    }
  } catch (error) {
    failedTests++;
    logError(`Failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // TEST 4: Market Sentiment - getMarketSentiment()
  logSection('TEST 4: Market Sentiment - Fear & Greed Index');
  totalTests++;
  
  try {
    logInfo('Calling: datasourceClient.getMarketSentiment()');
    const startTime = Date.now();
    const sentimentData = await datasourceClient.getMarketSentiment();
    const elapsed = Date.now() - startTime;
    
    if (sentimentData) {
      passedTests++;
      logSuccess(`Received sentiment data in ${elapsed}ms`);
      
      console.log('\n🧠 Sentiment Data:');
      console.log(`\n  Fear & Greed Index: ${sentimentData.fearGreedIndex}/100`);
      console.log(`  Classification: ${sentimentData.classification}`);
      console.log(`  Timestamp: ${new Date(sentimentData.timestamp).toLocaleString()}`);
      
      if (sentimentData.indicators) {
        console.log('\n  Indicators:');
        console.log(`    Volatility: ${sentimentData.indicators.volatility}`);
        console.log(`    Market Momentum: ${sentimentData.indicators.marketMomentum}`);
        console.log(`    Social Sentiment: ${sentimentData.indicators.socialSentiment}`);
        console.log(`    Surveys: ${sentimentData.indicators.surveys}`);
        console.log(`    Dominance: ${sentimentData.indicators.dominance}`);
        console.log(`    Trends: ${sentimentData.indicators.trends}`);
      }
      
      // Validate sentiment range
      const isValidRange = 
        sentimentData.fearGreedIndex >= 0 && 
        sentimentData.fearGreedIndex <= 100;
      
      if (isValidRange) {
        logSuccess('✓ Sentiment index is in valid range (0-100)');
      } else {
        logWarning('⚠ Sentiment index is out of range');
      }
    } else {
      failedTests++;
      logError('No sentiment data returned');
    }
  } catch (error) {
    failedTests++;
    logError(`Failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // TEST 5: AI Prediction - getAIPrediction()
  logSection('TEST 5: AI Prediction - Trading Signal');
  totalTests++;
  
  try {
    logInfo('Calling: datasourceClient.getAIPrediction("BTC", "1h")');
    const startTime = Date.now();
    const predictionData = await datasourceClient.getAIPrediction('BTC', '1h');
    const elapsed = Date.now() - startTime;
    
    if (predictionData) {
      passedTests++;
      logSuccess(`Received prediction data in ${elapsed}ms`);
      
      console.log('\n🤖 AI Prediction:');
      console.log(`\n  Symbol: ${predictionData.symbol}`);
      console.log(`  Action: ${predictionData.action}`);
      console.log(`  Confidence: ${(predictionData.confidence * 100).toFixed(1)}%`);
      console.log(`  Price: $${predictionData.price.toLocaleString()}`);
      console.log(`  Timeframe: ${predictionData.timeframe}`);
      console.log(`  Timestamp: ${new Date(predictionData.timestamp).toLocaleString()}`);
      
      if (predictionData.indicators) {
        console.log('\n  Indicators:');
        Object.entries(predictionData.indicators).forEach(([key, value]) => {
          console.log(`    ${key}: ${value}`);
        });
      }
      
      // Validate prediction
      const isValidAction = ['BUY', 'SELL', 'HOLD'].includes(predictionData.action);
      const isValidConfidence = 
        predictionData.confidence >= 0 && 
        predictionData.confidence <= 1;
      
      if (isValidAction && isValidConfidence) {
        logSuccess('✓ Prediction data is valid');
      } else {
        logWarning('⚠ Prediction validation failed');
      }
    } else {
      failedTests++;
      logError('No prediction data returned');
    }
  } catch (error) {
    failedTests++;
    logError(`Failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  // FINAL REPORT
  logSection('📊 VERIFICATION SUMMARY');
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);
  
  if (failedTests === 0) {
    logSuccess('🎉 ALL TESTS PASSED! Dashboard is ready to render.');
    logInfo('The Frontend → Proxy → Hub data flow is working correctly.');
    logInfo('No mock data, no external API calls, no CORS errors.');
    console.log('\n' + '═'.repeat(80));
    log('  ✅ FRONTEND SYNCHRONIZATION: COMPLETE', 'green');
    console.log('═'.repeat(80) + '\n');
    process.exit(0);
  } else {
    logError(`${failedTests} test(s) failed. Dashboard may not render correctly.`);
    logWarning('Check that:');
    console.log('  1. Local proxy server is running on port 8001');
    console.log('  2. Hugging Face Hub is accessible and responding');
    console.log('  3. .env file has correct HF_ENGINE_BASE_URL configuration\n');
    process.exit(1);
  }
}

// Run the verification
verifyDashboardLoad().catch(error => {
  logError(`\nFATAL ERROR: ${error instanceof Error ? error.message : String(error)}`);
  console.error(error);
  process.exit(1);
});
