#!/usr/bin/env tsx
/**
 * FINAL SYSTEM VERIFICATION SCRIPT
 * ================================
 * Comprehensive test script to verify system connectivity and data flow
 * 
 * Tests:
 * 1. Backend health check (localhost:8001/api/health)
 * 2. Data flow verification (getTopCoins, getPriceChart, getLatestNews)
 * 3. Data integrity checks (non-empty arrays, valid numbers)
 * 4. API response validation
 */

import { DatasourceClient } from '../src/services/DatasourceClient';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(result: TestResult) {
  const icon = result.status === 'PASS' ? '✅' : '❌';
  const color = result.status === 'PASS' ? colors.green : colors.red;
  log(`${icon} ${result.name}: ${result.message}`, color);
  if (result.details) {
    log(`   ${JSON.stringify(result.details, null, 2)}`, colors.gray);
  }
}

async function testHealthEndpoint(): Promise<TestResult> {
  try {
    log('\n📡 Testing backend health endpoint...', colors.cyan);
    const response = await fetch('http://localhost:8001/api/health');
    
    if (!response.ok) {
      return {
        name: 'Health Endpoint',
        status: 'FAIL',
        message: `HTTP ${response.status} - Backend not responding correctly`,
      };
    }

    const data = await response.json();
    
    if (data && data.status === 'healthy') {
      return {
        name: 'Health Endpoint',
        status: 'PASS',
        message: 'Backend is healthy and responding',
        details: { status: data.status, timestamp: data.timestamp },
      };
    }

    return {
      name: 'Health Endpoint',
      status: 'FAIL',
      message: 'Backend returned unexpected response',
      details: data,
    };
  } catch (error) {
    return {
      name: 'Health Endpoint',
      status: 'FAIL',
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function testGetTopCoins(): Promise<TestResult> {
  try {
    log('\n💰 Testing getTopCoins data flow...', colors.cyan);
    const datasource = DatasourceClient.getInstance();
    const coins = await datasource.getTopCoins(5, ['BTC', 'ETH', 'SOL']);

    // Check if response is an array
    if (!Array.isArray(coins)) {
      return {
        name: 'getTopCoins',
        status: 'FAIL',
        message: 'Response is not an array',
        details: { type: typeof coins, value: coins },
      };
    }

    // Check if array is not empty
    if (coins.length === 0) {
      return {
        name: 'getTopCoins',
        status: 'FAIL',
        message: 'Returned empty array',
      };
    }

    // Check data integrity
    const invalidCoins = coins.filter(coin => 
      !coin.symbol || 
      !coin.price || 
      isNaN(coin.price) || 
      coin.price <= 0
    );

    if (invalidCoins.length > 0) {
      return {
        name: 'getTopCoins',
        status: 'FAIL',
        message: `Found ${invalidCoins.length} coins with invalid data`,
        details: { invalidCoins },
      };
    }

    return {
      name: 'getTopCoins',
      status: 'PASS',
      message: `Successfully fetched ${coins.length} coins with valid data`,
      details: {
        count: coins.length,
        sample: coins.slice(0, 2).map(c => ({
          symbol: c.symbol,
          price: c.price,
          change24h: c.changePercent24h,
        })),
      },
    };
  } catch (error) {
    return {
      name: 'getTopCoins',
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function testGetPriceChart(): Promise<TestResult> {
  try {
    log('\n📊 Testing getPriceChart data flow...', colors.cyan);
    const datasource = DatasourceClient.getInstance();
    const chartData = await datasource.getPriceChart('BTCUSDT', '1h', 100);

    // Check if response is an array
    if (!Array.isArray(chartData)) {
      return {
        name: 'getPriceChart',
        status: 'FAIL',
        message: 'Response is not an array',
        details: { type: typeof chartData },
      };
    }

    // Check if array is not empty
    if (chartData.length === 0) {
      return {
        name: 'getPriceChart',
        status: 'FAIL',
        message: 'Returned empty array',
      };
    }

    // Check OHLCV data integrity
    const invalidBars = chartData.filter(bar => 
      !bar.timestamp ||
      !bar.open || isNaN(bar.open) || bar.open <= 0 ||
      !bar.high || isNaN(bar.high) || bar.high <= 0 ||
      !bar.low || isNaN(bar.low) || bar.low <= 0 ||
      !bar.close || isNaN(bar.close) || bar.close <= 0 ||
      bar.high < bar.low ||
      bar.high < bar.open ||
      bar.high < bar.close ||
      bar.low > bar.open ||
      bar.low > bar.close
    );

    if (invalidBars.length > 0) {
      return {
        name: 'getPriceChart',
        status: 'FAIL',
        message: `Found ${invalidBars.length} bars with invalid OHLCV data`,
        details: { invalidBars: invalidBars.slice(0, 3) },
      };
    }

    return {
      name: 'getPriceChart',
      status: 'PASS',
      message: `Successfully fetched ${chartData.length} valid OHLCV bars`,
      details: {
        count: chartData.length,
        latest: {
          timestamp: new Date(chartData[chartData.length - 1].timestamp).toISOString(),
          close: chartData[chartData.length - 1].close,
        },
      },
    };
  } catch (error) {
    return {
      name: 'getPriceChart',
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function testGetLatestNews(): Promise<TestResult> {
  try {
    log('\n📰 Testing getLatestNews data flow...', colors.cyan);
    const datasource = DatasourceClient.getInstance();
    const news = await datasource.getLatestNews(10);

    // Check if response is an array
    if (!Array.isArray(news)) {
      return {
        name: 'getLatestNews',
        status: 'FAIL',
        message: 'Response is not an array',
        details: { type: typeof news },
      };
    }

    // Check if array is not empty
    if (news.length === 0) {
      return {
        name: 'getLatestNews',
        status: 'FAIL',
        message: 'Returned empty array (no news available)',
      };
    }

    // Check news data integrity
    const invalidNews = news.filter(item => 
      !item.id ||
      !item.title ||
      !item.source
    );

    if (invalidNews.length > 0) {
      return {
        name: 'getLatestNews',
        status: 'FAIL',
        message: `Found ${invalidNews.length} news items with invalid data`,
        details: { invalidNews: invalidNews.slice(0, 2) },
      };
    }

    return {
      name: 'getLatestNews',
      status: 'PASS',
      message: `Successfully fetched ${news.length} valid news items`,
      details: {
        count: news.length,
        sample: news.slice(0, 2).map(n => ({
          title: n.title.substring(0, 50) + '...',
          source: n.source,
        })),
      },
    };
  } catch (error) {
    return {
      name: 'getLatestNews',
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function testDataIntegrity(): Promise<TestResult> {
  try {
    log('\n🔍 Testing overall data integrity...', colors.cyan);
    const datasource = DatasourceClient.getInstance();
    
    // Fetch multiple data types simultaneously
    const [coins, chartData, news] = await Promise.all([
      datasource.getTopCoins(3),
      datasource.getPriceChart('BTCUSDT', '1h', 50),
      datasource.getLatestNews(5),
    ]);

    const issues: string[] = [];

    // Check if all responses are arrays
    if (!Array.isArray(coins)) issues.push('coins is not an array');
    if (!Array.isArray(chartData)) issues.push('chartData is not an array');
    if (!Array.isArray(news)) issues.push('news is not an array');

    // Check if all responses have data
    if (coins.length === 0) issues.push('coins array is empty');
    if (chartData.length === 0) issues.push('chartData array is empty');
    // News can be empty in some cases, so we won't fail on this

    if (issues.length > 0) {
      return {
        name: 'Data Integrity',
        status: 'FAIL',
        message: 'Multiple data integrity issues detected',
        details: { issues },
      };
    }

    return {
      name: 'Data Integrity',
      status: 'PASS',
      message: 'All data sources returning valid, consistent data',
      details: {
        coins: coins.length,
        chartBars: chartData.length,
        newsItems: news.length,
      },
    };
  } catch (error) {
    return {
      name: 'Data Integrity',
      status: 'FAIL',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(70), colors.bright);
  log('🚀 FINAL SYSTEM VERIFICATION', colors.bright);
  log('='.repeat(70) + '\n', colors.bright);

  // Run all tests
  results.push(await testHealthEndpoint());
  results.push(await testGetTopCoins());
  results.push(await testGetPriceChart());
  results.push(await testGetLatestNews());
  results.push(await testDataIntegrity());

  // Print all results
  log('\n' + '='.repeat(70), colors.bright);
  log('📋 TEST RESULTS', colors.bright);
  log('='.repeat(70) + '\n', colors.bright);

  results.forEach(result => logTest(result));

  // Summary
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const totalCount = results.length;
  const successRate = Math.round((passCount / totalCount) * 100);

  log('\n' + '='.repeat(70), colors.bright);
  log('📊 SUMMARY', colors.bright);
  log('='.repeat(70), colors.bright);
  log(`\n✅ Passed: ${passCount}/${totalCount}`, colors.green);
  log(`❌ Failed: ${failCount}/${totalCount}`, failCount > 0 ? colors.red : colors.green);
  log(`📈 Success Rate: ${successRate}%\n`, successRate === 100 ? colors.green : colors.yellow);

  // Final verdict
  log('='.repeat(70), colors.bright);
  if (failCount === 0) {
    log('🎉 FINAL VERDICT: SYSTEM IS READY ✅', colors.green);
    log('All connectivity and data flow tests passed!', colors.green);
  } else {
    log('⚠️  FINAL VERDICT: FIXES REQUIRED ❌', colors.red);
    log(`${failCount} test(s) failed. Please review the errors above.`, colors.red);
  }
  log('='.repeat(70) + '\n', colors.bright);

  // Exit with appropriate code
  process.exit(failCount > 0 ? 1 : 0);
}

// Run the tests
runAllTests().catch(error => {
  log(`\n❌ Fatal Error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
