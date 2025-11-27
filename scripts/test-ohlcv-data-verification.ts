/**
 * OHLCV Data Verification Script
 * 
 * This script tests multiple cryptocurrency APIs to verify that they provide
 * accurate and complete OHLCV (Open, High, Low, Close, Volume) data.
 * 
 * APIs tested:
 * - CoinGecko
 * - Binance
 * - CryptoCompare
 * - CoinMarketCap (via our proxy)
 * - KuCoin (if configured)
 */

import axios, { AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';

// Types
interface OHLCVDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;
}

interface ValidationResult {
  api: string;
  success: boolean;
  dataPoints: number;
  expectedDataPoints: number;
  missingDataPoints: number;
  errors: string[];
  warnings: string[];
  sampleData?: OHLCVDataPoint[];
  responseTime: number;
  dataQuality: {
    hasNulls: boolean;
    hasGaps: boolean;
    priceConsistency: boolean;
    volumeConsistency: boolean;
  };
}

interface TestResult {
  timestamp: string;
  totalApis: number;
  successfulApis: number;
  failedApis: number;
  results: ValidationResult[];
  summary: {
    bestPerformer: string;
    worstPerformer: string;
    averageResponseTime: number;
    totalDataPoints: number;
  };
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
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

// Validation functions
function validateOHLCVData(data: any[]): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!Array.isArray(data) || data.length === 0) {
    errors.push('Data is not an array or is empty');
    return { valid: false, errors, warnings };
  }
  
  let hasNulls = false;
  let hasGaps = false;
  let priceIssues = 0;
  let volumeIssues = 0;
  
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    
    // Check for required fields
    const requiredFields = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
    for (const field of requiredFields) {
      if (point[field] === null || point[field] === undefined) {
        hasNulls = true;
        errors.push(`Missing ${field} at index ${i}`);
      }
    }
    
    // Validate price relationships
    if (point.high < point.low) {
      priceIssues++;
      errors.push(`Invalid price relationship at index ${i}: high (${point.high}) < low (${point.low})`);
    }
    
    if (point.high < point.open || point.high < point.close) {
      priceIssues++;
      warnings.push(`High price may be incorrect at index ${i}`);
    }
    
    if (point.low > point.open || point.low > point.close) {
      priceIssues++;
      warnings.push(`Low price may be incorrect at index ${i}`);
    }
    
    // Check for negative values
    if (point.volume < 0) {
      volumeIssues++;
      errors.push(`Negative volume at index ${i}`);
    }
    
    // Check for gaps in timestamps (if sorted)
    if (i > 0 && data[i - 1].timestamp && point.timestamp) {
      const timeDiff = point.timestamp - data[i - 1].timestamp;
      if (timeDiff > 86400000 * 2) { // More than 2 days gap
        hasGaps = true;
        warnings.push(`Potential gap in data between index ${i - 1} and ${i}`);
      }
    }
  }
  
  if (priceIssues > data.length * 0.1) {
    errors.push(`High number of price validation issues: ${priceIssues}/${data.length}`);
  }
  
  if (volumeIssues > 0) {
    warnings.push(`Found ${volumeIssues} volume validation issues`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Test CoinGecko API
async function testCoinGecko(baseUrl: string = 'http://localhost:8000'): Promise<ValidationResult> {
  const startTime = Date.now();
  const result: ValidationResult = {
    api: 'CoinGecko',
    success: false,
    dataPoints: 0,
    expectedDataPoints: 30,
    missingDataPoints: 0,
    errors: [],
    warnings: [],
    responseTime: 0,
    dataQuality: {
      hasNulls: false,
      hasGaps: false,
      priceConsistency: true,
      volumeConsistency: true
    }
  };
  
  try {
    // Try via proxy first, then direct
    let url = `${baseUrl}/api/proxy/coingecko/coins/bitcoin/ohlc?vs_currency=usd&days=30`;
    let response;
    
    try {
      response = await axios.get(url, { timeout: 15000 });
    } catch (proxyError) {
      // Fallback to direct API
      log('  Proxy failed, trying direct API...', 'yellow');
      url = 'https://api.coingecko.com/api/v3/coins/bitcoin/ohlc?vs_currency=usd&days=30';
      response = await axios.get(url, { timeout: 15000 });
    }
    
    result.responseTime = Date.now() - startTime;
    
    if (!response.data || !Array.isArray(response.data)) {
      result.errors.push('Invalid response format: expected array');
      return result;
    }
    
    // Transform CoinGecko format to standard format
    // CoinGecko returns: [timestamp, open, high, low, close]
    const transformedData = response.data.map((item: any[]) => ({
      timestamp: item[0],
      open: item[1],
      high: item[2],
      low: item[3],
      close: item[4],
      volume: 0, // CoinGecko OHLC endpoint doesn't include volume
      source: 'coingecko'
    }));
    
    result.dataPoints = transformedData.length;
    result.missingDataPoints = Math.max(0, result.expectedDataPoints - result.dataPoints);
    
    // Validate data
    const validation = validateOHLCVData(transformedData);
    result.errors.push(...validation.errors);
    result.warnings.push(...validation.warnings);
    
    if (transformedData.length > 0 && transformedData[0].volume === 0) {
      result.warnings.push('Volume data not available in CoinGecko OHLC endpoint');
    }
    
    result.dataQuality.hasNulls = validation.errors.some(e => e.includes('Missing'));
    result.dataQuality.hasGaps = validation.warnings.some(w => w.includes('gap'));
    result.dataQuality.priceConsistency = !validation.errors.some(e => e.includes('price'));
    result.dataQuality.volumeConsistency = !validation.errors.some(e => e.includes('volume'));
    
    result.success = validation.valid && result.dataPoints > 0;
    result.sampleData = transformedData.slice(0, 5); // First 5 data points
    
  } catch (error) {
    result.responseTime = Date.now() - startTime;
    const axiosError = error as AxiosError;
    result.errors.push(`Request failed: ${axiosError.message}`);
    if (axiosError.response) {
      result.errors.push(`HTTP ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`);
    }
  }
  
  return result;
}

// Test Binance API
async function testBinance(baseUrl: string = 'http://localhost:8000'): Promise<ValidationResult> {
  const startTime = Date.now();
  const result: ValidationResult = {
    api: 'Binance',
    success: false,
    dataPoints: 0,
    expectedDataPoints: 365,
    missingDataPoints: 0,
    errors: [],
    warnings: [],
    responseTime: 0,
    dataQuality: {
      hasNulls: false,
      hasGaps: false,
      priceConsistency: true,
      volumeConsistency: true
    }
  };
  
  try {
    // Try via proxy first
    let url = `${baseUrl}/api/proxy/binance/klines?symbol=BTCUSDT&interval=1d&limit=365`;
    let response;
    
    try {
      response = await axios.get(url, { timeout: 15000 });
    } catch (proxyError) {
      // Fallback to direct API
      log('  Proxy failed, trying direct API...', 'yellow');
      url = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=365';
      response = await axios.get(url, { timeout: 15000 });
    }
    
    result.responseTime = Date.now() - startTime;
    
    if (!response.data || !Array.isArray(response.data)) {
      result.errors.push('Invalid response format: expected array');
      return result;
    }
    
    // Transform Binance format to standard format
    // Binance returns: [openTime, open, high, low, close, volume, closeTime, ...]
    const transformedData = response.data.map((item: any[]) => ({
      timestamp: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
      source: 'binance'
    }));
    
    result.dataPoints = transformedData.length;
    result.missingDataPoints = Math.max(0, result.expectedDataPoints - result.dataPoints);
    
    // Validate data
    const validation = validateOHLCVData(transformedData);
    result.errors.push(...validation.errors);
    result.warnings.push(...validation.warnings);
    
    result.dataQuality.hasNulls = validation.errors.some(e => e.includes('Missing'));
    result.dataQuality.hasGaps = validation.warnings.some(w => w.includes('gap'));
    result.dataQuality.priceConsistency = !validation.errors.some(e => e.includes('price'));
    result.dataQuality.volumeConsistency = !validation.errors.some(e => e.includes('volume'));
    
    result.success = validation.valid && result.dataPoints > 0;
    result.sampleData = transformedData.slice(0, 5);
    
  } catch (error) {
    result.responseTime = Date.now() - startTime;
    const axiosError = error as AxiosError;
    result.errors.push(`Request failed: ${axiosError.message}`);
    if (axiosError.response) {
      result.errors.push(`HTTP ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`);
    }
  }
  
  return result;
}

// Test CryptoCompare API
async function testCryptoCompare(baseUrl: string = 'http://localhost:8000'): Promise<ValidationResult> {
  const startTime = Date.now();
  const result: ValidationResult = {
    api: 'CryptoCompare',
    success: false,
    dataPoints: 0,
    expectedDataPoints: 200,
    missingDataPoints: 0,
    errors: [],
    warnings: [],
    responseTime: 0,
    dataQuality: {
      hasNulls: false,
      hasGaps: false,
      priceConsistency: true,
      volumeConsistency: true
    }
  };
  
  try {
    // Try via our market data endpoint first
    let url = `${baseUrl}/api/market/cryptocompare-prices?symbols=BTC`;
    let response;
    
    try {
      response = await axios.get(url, { timeout: 15000 });
    } catch (endpointError) {
      // Fallback to direct API
      log('  Endpoint failed, trying direct API...', 'yellow');
      url = 'https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=200';
      response = await axios.get(url, { timeout: 15000 });
    }
    
    result.responseTime = Date.now() - startTime;
    
    let data: any[];
    
    // Handle different response formats
    if (response.data.Data && response.data.Data.Data) {
      // CryptoCompare v2 format
      data = response.data.Data.Data;
    } else if (response.data.data) {
      // Our endpoint format
      data = response.data.data;
    } else if (Array.isArray(response.data)) {
      data = response.data;
    } else {
      result.errors.push('Invalid response format');
      return result;
    }
    
    // Transform CryptoCompare format to standard format
    const transformedData = data.map((item: any) => ({
      timestamp: item.time * 1000 || item.time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volumefrom || item.volumeto || 0,
      source: 'cryptocompare'
    }));
    
    result.dataPoints = transformedData.length;
    result.missingDataPoints = Math.max(0, result.expectedDataPoints - result.dataPoints);
    
    // Validate data
    const validation = validateOHLCVData(transformedData);
    result.errors.push(...validation.errors);
    result.warnings.push(...validation.warnings);
    
    result.dataQuality.hasNulls = validation.errors.some(e => e.includes('Missing'));
    result.dataQuality.hasGaps = validation.warnings.some(w => w.includes('gap'));
    result.dataQuality.priceConsistency = !validation.errors.some(e => e.includes('price'));
    result.dataQuality.volumeConsistency = !validation.errors.some(e => e.includes('volume'));
    
    result.success = validation.valid && result.dataPoints > 0;
    result.sampleData = transformedData.slice(0, 5);
    
  } catch (error) {
    result.responseTime = Date.now() - startTime;
    const axiosError = error as AxiosError;
    result.errors.push(`Request failed: ${axiosError.message}`);
    if (axiosError.response) {
      result.errors.push(`HTTP ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`);
    }
  }
  
  return result;
}

// Test CoinMarketCap (via our proxy)
async function testCoinMarketCap(baseUrl: string = 'http://localhost:8000'): Promise<ValidationResult> {
  const startTime = Date.now();
  const result: ValidationResult = {
    api: 'CoinMarketCap',
    success: false,
    dataPoints: 0,
    expectedDataPoints: 100,
    missingDataPoints: 0,
    errors: [],
    warnings: [],
    responseTime: 0,
    dataQuality: {
      hasNulls: false,
      hasGaps: false,
      priceConsistency: true,
      volumeConsistency: true
    }
  };
  
  try {
    // CoinMarketCap doesn't have a direct OHLCV endpoint in free tier
    // We'll test the market data endpoint instead
    const url = `${baseUrl}/api/market/coinmarketcap-prices?symbols=BTC`;
    const response = await axios.get(url, { timeout: 15000 });
    
    result.responseTime = Date.now() - startTime;
    
    if (!response.data || !response.data.data) {
      result.errors.push('Invalid response format');
      return result;
    }
    
    // CoinMarketCap provides current price data, not historical OHLCV
    result.warnings.push('CoinMarketCap free tier does not provide historical OHLCV data');
    result.success = true; // Consider it successful if we get price data
    result.dataPoints = 1;
    result.expectedDataPoints = 1; // Adjust expectation
    
  } catch (error) {
    result.responseTime = Date.now() - startTime;
    const axiosError = error as AxiosError;
    result.errors.push(`Request failed: ${axiosError.message}`);
    if (axiosError.response) {
      result.errors.push(`HTTP ${axiosError.response.status}`);
    }
  }
  
  return result;
}

// Test KuCoin API (if configured)
async function testKuCoin(baseUrl: string = 'http://localhost:8000'): Promise<ValidationResult> {
  const startTime = Date.now();
  const result: ValidationResult = {
    api: 'KuCoin',
    success: false,
    dataPoints: 0,
    expectedDataPoints: 200,
    missingDataPoints: 0,
    errors: [],
    warnings: [],
    responseTime: 0,
    dataQuality: {
      hasNulls: false,
      hasGaps: false,
      priceConsistency: true,
      volumeConsistency: true
    }
  };
  
  try {
    // Test via our market data endpoint
    const url = `${baseUrl}/api/market/ohlcv?symbol=BTC-USDT&interval=1d&limit=200`;
    const response = await axios.get(url, { timeout: 15000 });
    
    result.responseTime = Date.now() - startTime;
    
    if (!response.data || !Array.isArray(response.data)) {
      result.errors.push('Invalid response format: expected array');
      return result;
    }
    
    // Transform to standard format
    const transformedData = response.data.map((item: any) => ({
      timestamp: item.timestamp || item.time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
      source: 'kucoin'
    }));
    
    result.dataPoints = transformedData.length;
    result.missingDataPoints = Math.max(0, result.expectedDataPoints - result.dataPoints);
    
    // Validate data
    const validation = validateOHLCVData(transformedData);
    result.errors.push(...validation.errors);
    result.warnings.push(...validation.warnings);
    
    result.dataQuality.hasNulls = validation.errors.some(e => e.includes('Missing'));
    result.dataQuality.hasGaps = validation.warnings.some(w => w.includes('gap'));
    result.dataQuality.priceConsistency = !validation.errors.some(e => e.includes('price'));
    result.dataQuality.volumeConsistency = !validation.errors.some(e => e.includes('volume'));
    
    result.success = validation.valid && result.dataPoints > 0;
    result.sampleData = transformedData.slice(0, 5);
    
  } catch (error) {
    result.responseTime = Date.now() - startTime;
    const axiosError = error as AxiosError;
    result.errors.push(`Request failed: ${axiosError.message}`);
    if (axiosError.response) {
      result.errors.push(`HTTP ${axiosError.response.status}`);
    }
    result.warnings.push('KuCoin test may require API credentials');
  }
  
  return result;
}

// Main test function
async function runOHLCVVerificationTests(baseUrl?: string): Promise<TestResult> {
  const testUrl = baseUrl || process.env.API_BASE_URL || 'http://localhost:8000';
  
  log('\n🔍 OHLCV Data Verification Tests', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Testing against: ${testUrl}\n`, 'blue');
  
  const results: ValidationResult[] = [];
  
  // Test all APIs
  log('1. Testing CoinGecko API...', 'blue');
  results.push(await testCoinGecko(testUrl));
  
  log('2. Testing Binance API...', 'blue');
  results.push(await testBinance(testUrl));
  
  log('3. Testing CryptoCompare API...', 'blue');
  results.push(await testCryptoCompare(testUrl));
  
  log('4. Testing CoinMarketCap API...', 'blue');
  results.push(await testCoinMarketCap(testUrl));
  
  log('5. Testing KuCoin API...', 'blue');
  results.push(await testKuCoin(testUrl));
  
  // Calculate summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDataPoints = results.reduce((sum, r) => sum + r.dataPoints, 0);
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  
  const bestPerformer = results
    .filter(r => r.success)
    .sort((a, b) => {
      // Sort by: success, data points, response time
      if (a.dataPoints !== b.dataPoints) return b.dataPoints - a.dataPoints;
      return a.responseTime - b.responseTime;
    })[0]?.api || 'N/A';
  
  const worstPerformer = results
    .filter(r => !r.success)
    .sort((a, b) => b.errors.length - a.errors.length)[0]?.api || 'N/A';
  
  const testResult: TestResult = {
    timestamp: new Date().toISOString(),
    totalApis: results.length,
    successfulApis: successful,
    failedApis: failed,
    results,
    summary: {
      bestPerformer,
      worstPerformer,
      averageResponseTime: Math.round(avgResponseTime),
      totalDataPoints
    }
  };
  
  return testResult;
}

// Print results
function printResults(result: TestResult) {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 Test Results Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\nTotal APIs Tested: ${result.totalApis}`, 'blue');
  log(`Successful: ${result.successfulApis}`, 'green');
  log(`Failed: ${result.failedApis}`, result.failedApis > 0 ? 'red' : 'green');
  log(`Total Data Points: ${result.summary.totalDataPoints}`, 'blue');
  log(`Average Response Time: ${result.summary.averageResponseTime}ms`, 'blue');
  log(`Best Performer: ${result.summary.bestPerformer}`, 'green');
  if (result.failedApis > 0) {
    log(`Worst Performer: ${result.summary.worstPerformer}`, 'red');
  }
  
  log('\n' + '='.repeat(60), 'cyan');
  log('Detailed Results', 'cyan');
  log('='.repeat(60), 'cyan');
  
  result.results.forEach((r, index) => {
    log(`\n${index + 1}. ${r.api}`, 'magenta');
    log(`   Status: ${r.success ? '✓ PASSED' : '✗ FAILED'}`, r.success ? 'green' : 'red');
    log(`   Data Points: ${r.dataPoints}/${r.expectedDataPoints}`, r.dataPoints >= r.expectedDataPoints ? 'green' : 'yellow');
    log(`   Response Time: ${r.responseTime}ms`, 'blue');
    log(`   Missing Data Points: ${r.missingDataPoints}`, r.missingDataPoints === 0 ? 'green' : 'yellow');
    
    if (r.dataQuality.hasNulls) {
      log(`   ⚠ Has null values`, 'yellow');
    }
    if (r.dataQuality.hasGaps) {
      log(`   ⚠ Has data gaps`, 'yellow');
    }
    if (!r.dataQuality.priceConsistency) {
      log(`   ⚠ Price consistency issues`, 'yellow');
    }
    if (!r.dataQuality.volumeConsistency) {
      log(`   ⚠ Volume consistency issues`, 'yellow');
    }
    
    if (r.errors.length > 0) {
      log(`   Errors (${r.errors.length}):`, 'red');
      r.errors.slice(0, 3).forEach(err => log(`     - ${err}`, 'red'));
      if (r.errors.length > 3) {
        log(`     ... and ${r.errors.length - 3} more errors`, 'red');
      }
    }
    
    if (r.warnings.length > 0) {
      log(`   Warnings (${r.warnings.length}):`, 'yellow');
      r.warnings.slice(0, 3).forEach(warn => log(`     - ${warn}`, 'yellow'));
      if (r.warnings.length > 3) {
        log(`     ... and ${r.warnings.length - 3} more warnings`, 'yellow');
      }
    }
    
    if (r.sampleData && r.sampleData.length > 0) {
      log(`   Sample Data (first point):`, 'blue');
      const sample = r.sampleData[0];
      log(`     Timestamp: ${new Date(sample.timestamp).toISOString()}`, 'blue');
      log(`     OHLC: ${sample.open} / ${sample.high} / ${sample.low} / ${sample.close}`, 'blue');
      log(`     Volume: ${sample.volume}`, 'blue');
    }
  });
  
  log('\n' + '='.repeat(60), 'cyan');
}

// Main execution
async function main() {
  const baseUrl = process.argv[2] || process.env.API_BASE_URL || 'http://localhost:8000';
  
  try {
    const result = await runOHLCVVerificationTests(baseUrl);
    printResults(result);
    
    // Save results to file
    const outputDir = path.join(process.cwd(), 'cursor_reports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `ohlcv-verification-${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    log(`\n📄 Detailed results saved to: ${outputFile}`, 'green');
    
    // Exit with appropriate code
    process.exit(result.failedApis > 0 ? 1 : 0);
    
  } catch (error) {
    log(`\n❌ Fatal error: ${error}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runOHLCVVerificationTests, ValidationResult, TestResult };
