#!/usr/bin/env tsx
/**
 * STRESS TEST FOR CORE TRADING LOGIC
 * Tests system performance under heavy load with large datasets
 */

import { BullBearAgent } from '../src/ai/BullBearAgent.js';
import { BacktestEngine } from '../src/ai/BacktestEngine.js';
import { runStrategyEngine, generateFeatures } from '../src/strategy/index.js';
import { OrderManagementService } from '../src/services/OrderManagementService.js';
import { MarketData } from '../src/types/index.js';

// ================== SYNTHETIC DATA GENERATOR ==================

function generateSyntheticOHLCV(count: number, basePrice: number = 50000): any[] {
  const data = [];
  let price = basePrice;
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const trendFactor = Math.sin(i / 20) * 0.015;
    const randomFactor = (Math.random() - 0.5) * 0.008;
    const movement = (trendFactor + randomFactor) * price;
    
    price += movement;
    
    const open = price + (Math.random() - 0.5) * price * 0.001;
    const close = price + (Math.random() - 0.5) * price * 0.001;
    const high = Math.max(open, close) + Math.random() * price * 0.002;
    const low = Math.min(open, close) - Math.random() * price * 0.002;
    const volume = 1000000 + Math.random() * 500000;
    
    data.push({
      timestamp: now - (count - i) * 3600000,
      open,
      high,
      low,
      close,
      volume
    });
  }
  
  return data;
}

function convertToMarketData(ohlcvData: any[]): MarketData[] {
  return ohlcvData.map(candle => ({
    symbol: 'BTC/USDT',
    timestamp: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    timeframe: '1h'
  }));
}

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

// ================== STRESS TEST 1: LARGE DATASET PROCESSING ==================

async function testLargeDatasetProcessing(): Promise<{ success: boolean; metrics: any }> {
  const testName = 'LARGE DATASET';
  log(testName, 'Testing with 1000 candles...');
  
  const startTime = Date.now();
  
  try {
    // Generate 1000 candles
    const ohlcvData = generateSyntheticOHLCV(1000, 50000);
    const marketData = convertToMarketData(ohlcvData);
    
    log(testName, `Generated ${marketData.length} candles in ${Date.now() - startTime}ms`);
    
    // Test feature calculation on large dataset
    const featureStartTime = Date.now();
    const features = generateFeatures(ohlcvData);
    const featureTime = Date.now() - featureStartTime;
    
    log(testName, `Calculated features in ${featureTime}ms`);
    
    // Test AI prediction on large dataset
    const agent = BullBearAgent.getInstance();
    await agent.initialize();
    
    const aiStartTime = Date.now();
    const prediction = await agent.predict(marketData.slice(-200));
    const aiTime = Date.now() - aiStartTime;
    
    log(testName, `AI prediction took ${aiTime}ms`);
    
    const totalTime = Date.now() - startTime;
    
    const metrics = {
      dataPoints: marketData.length,
      totalTime,
      featureTime,
      aiTime,
      throughput: (marketData.length / totalTime * 1000).toFixed(2) + ' candles/sec'
    };
    
    log(testName, 'Performance Metrics:', metrics);
    
    // Performance thresholds
    if (featureTime > 5000) {
      fail(testName, `Feature calculation too slow: ${featureTime}ms (threshold: 5000ms)`);
      return { success: false, metrics };
    }
    
    if (aiTime > 10000) {
      fail(testName, `AI prediction too slow: ${aiTime}ms (threshold: 10000ms)`);
      return { success: false, metrics };
    }
    
    pass(testName, `Processed 1000 candles in ${totalTime}ms`);
    return { success: true, metrics };
  } catch (error) {
    fail(testName, 'Large dataset processing failed', error);
    return { success: false, metrics: null };
  }
}

// ================== STRESS TEST 2: CONCURRENT PREDICTIONS ==================

async function testConcurrentPredictions(): Promise<{ success: boolean; metrics: any }> {
  const testName = 'CONCURRENT PREDICTIONS';
  log(testName, 'Testing 20 concurrent AI predictions...');
  
  const startTime = Date.now();
  
  try {
    const ohlcvData = generateSyntheticOHLCV(200, 50000);
    const marketData = convertToMarketData(ohlcvData);
    
    const agent = BullBearAgent.getInstance();
    await agent.initialize();
    
    // Run 20 predictions concurrently
    const promises = [];
    for (let i = 0; i < 20; i++) {
      const slice = marketData.slice(i * 5, i * 5 + 100);
      if (slice.length >= 50) {
        promises.push(agent.predict(slice));
      }
    }
    
    const predictions = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    const metrics = {
      concurrentPredictions: predictions.length,
      totalTime,
      avgTimePerPrediction: (totalTime / predictions.length).toFixed(2) + 'ms',
      throughput: (predictions.length / totalTime * 1000).toFixed(2) + ' predictions/sec'
    };
    
    log(testName, 'Concurrent Performance:', metrics);
    
    // Verify all predictions are valid
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      if (!pred.action || !['LONG', 'SHORT', 'HOLD'].includes(pred.action)) {
        fail(testName, `Prediction ${i} has invalid action: ${pred.action}`);
        return { success: false, metrics };
      }
    }
    
    if (totalTime > 30000) {
      fail(testName, `Concurrent predictions too slow: ${totalTime}ms (threshold: 30000ms)`);
      return { success: false, metrics };
    }
    
    pass(testName, `Completed ${predictions.length} concurrent predictions in ${totalTime}ms`);
    return { success: true, metrics };
  } catch (error) {
    fail(testName, 'Concurrent predictions failed', error);
    return { success: false, metrics: null };
  }
}

// ================== STRESS TEST 3: LONG BACKTEST ==================

async function testLongBacktest(): Promise<{ success: boolean; metrics: any }> {
  const testName = 'LONG BACKTEST';
  log(testName, 'Testing backtest with 500 candles...');
  
  const startTime = Date.now();
  
  try {
    const ohlcvData = generateSyntheticOHLCV(500, 50000);
    const marketData = convertToMarketData(ohlcvData);
    
    const backtester = BacktestEngine.getInstance();
    
    const backtestConfig = {
      symbol: 'BTC/USDT',
      startDate: marketData[0].timestamp as number,
      endDate: marketData[marketData.length - 1].timestamp as number,
      initialCapital: 10000,
      feeRate: 0.001,
      slippageRate: 0.001
    };
    
    const result = await backtester.runBacktest(marketData, backtestConfig);
    const totalTime = Date.now() - startTime;
    
    const metrics = {
      dataPoints: marketData.length,
      totalTime,
      totalTrades: result.totalTrades,
      winRate: (result.winRate * 100).toFixed(2) + '%',
      throughput: (marketData.length / totalTime * 1000).toFixed(2) + ' candles/sec'
    };
    
    log(testName, 'Backtest Performance:', metrics);
    
    if (totalTime > 60000) {
      fail(testName, `Backtest too slow: ${totalTime}ms (threshold: 60000ms)`);
      return { success: false, metrics };
    }
    
    pass(testName, `Backtested 500 candles with ${result.totalTrades} trades in ${totalTime}ms`);
    return { success: true, metrics };
  } catch (error) {
    fail(testName, 'Long backtest failed', error);
    return { success: false, metrics: null };
  }
}

// ================== STRESS TEST 4: RAPID ORDER EXECUTION ==================

async function testRapidOrderExecution(): Promise<{ success: boolean; metrics: any }> {
  const testName = 'RAPID ORDERS';
  log(testName, 'Testing 100 rapid order executions...');
  
  const startTime = Date.now();
  
  try {
    const { Database } = await import('../src/data/Database.js');
    const db = Database.getInstance();
    
    // Seed market data
    const ohlcvData = generateSyntheticOHLCV(50, 50000);
    const marketData = convertToMarketData(ohlcvData);
    
    for (const data of marketData) {
      await db.insertMarketData(data);
    }
    
    const orderService = OrderManagementService.getInstance();
    orderService.setPortfolioValue(1000000); // $1M for stress testing
    
    // Execute 100 orders rapidly
    const orders = [];
    for (let i = 0; i < 100; i++) {
      const order = await orderService.createMarketOrder({
        symbol: 'BTC/USDT',
        side: i % 2 === 0 ? 'BUY' : 'SELL',
        quantity: 0.01,
        clientOrderId: `STRESS_${i}`
      });
      orders.push(order);
    }
    
    const totalTime = Date.now() - startTime;
    
    // Verify all orders
    const filledOrders = orders.filter(o => o.status === 'FILLED');
    const rejectedOrders = orders.filter(o => o.status === 'REJECTED');
    
    const metrics = {
      totalOrders: orders.length,
      filled: filledOrders.length,
      rejected: rejectedOrders.length,
      totalTime,
      avgTimePerOrder: (totalTime / orders.length).toFixed(2) + 'ms',
      throughput: (orders.length / totalTime * 1000).toFixed(2) + ' orders/sec'
    };
    
    log(testName, 'Order Execution Performance:', metrics);
    
    if (rejectedOrders.length > orders.length * 0.1) {
      fail(testName, `Too many rejected orders: ${rejectedOrders.length}/${orders.length}`);
      return { success: false, metrics };
    }
    
    if (totalTime > 10000) {
      fail(testName, `Order execution too slow: ${totalTime}ms (threshold: 10000ms)`);
      return { success: false, metrics };
    }
    
    pass(testName, `Executed ${orders.length} orders in ${totalTime}ms`);
    return { success: true, metrics };
  } catch (error) {
    fail(testName, 'Rapid order execution failed', error);
    return { success: false, metrics: null };
  }
}

// ================== STRESS TEST 5: MEMORY LEAK TEST ==================

async function testMemoryUsage(): Promise<{ success: boolean; metrics: any }> {
  const testName = 'MEMORY USAGE';
  log(testName, 'Testing memory usage during intensive operations...');
  
  try {
    const initialMemory = process.memoryUsage();
    
    // Perform intensive operations
    for (let iteration = 0; iteration < 10; iteration++) {
      const ohlcvData = generateSyntheticOHLCV(200, 50000);
      const marketData = convertToMarketData(ohlcvData);
      
      const features = generateFeatures(ohlcvData);
      
      const agent = BullBearAgent.getInstance();
      await agent.predict(marketData);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }
    
    const finalMemory = process.memoryUsage();
    
    const metrics = {
      initialHeapMB: (initialMemory.heapUsed / 1024 / 1024).toFixed(2),
      finalHeapMB: (finalMemory.heapUsed / 1024 / 1024).toFixed(2),
      heapGrowthMB: ((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2),
      rssGrowthMB: ((finalMemory.rss - initialMemory.rss) / 1024 / 1024).toFixed(2)
    };
    
    log(testName, 'Memory Metrics:', metrics);
    
    const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
    const heapGrowthMB = heapGrowth / 1024 / 1024;
    
    if (heapGrowthMB > 500) {
      fail(testName, `Excessive memory growth: ${heapGrowthMB.toFixed(2)}MB (threshold: 500MB)`);
      return { success: false, metrics };
    }
    
    pass(testName, `Memory growth within acceptable limits: ${heapGrowthMB.toFixed(2)}MB`);
    return { success: true, metrics };
  } catch (error) {
    fail(testName, 'Memory usage test failed', error);
    return { success: false, metrics: null };
  }
}

// ================== MAIN EXECUTION ==================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔥 STRESS TEST FOR CORE TRADING LOGIC');
  console.log('Testing system performance under heavy load');
  console.log('='.repeat(80));
  
  const results = {
    largeDataset: await testLargeDatasetProcessing(),
    concurrentPredictions: await testConcurrentPredictions(),
    longBacktest: await testLongBacktest(),
    rapidOrders: await testRapidOrderExecution(),
    memoryUsage: await testMemoryUsage()
  };
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 STRESS TEST SUMMARY');
  console.log('='.repeat(80));
  
  const tests = Object.entries(results);
  const passedTests = tests.filter(([_, result]) => result.success).length;
  
  console.log(`\n${results.largeDataset.success ? '✅' : '❌'} Large Dataset Processing:    ${results.largeDataset.success ? 'PASS' : 'FAIL'}`);
  console.log(`${results.concurrentPredictions.success ? '✅' : '❌'} Concurrent Predictions:      ${results.concurrentPredictions.success ? 'PASS' : 'FAIL'}`);
  console.log(`${results.longBacktest.success ? '✅' : '❌'} Long Backtest (500 candles): ${results.longBacktest.success ? 'PASS' : 'FAIL'}`);
  console.log(`${results.rapidOrders.success ? '✅' : '❌'} Rapid Order Execution:       ${results.rapidOrders.success ? 'PASS' : 'FAIL'}`);
  console.log(`${results.memoryUsage.success ? '✅' : '❌'} Memory Usage:                ${results.memoryUsage.success ? 'PASS' : 'FAIL'}`);
  
  console.log(`\n📈 Overall Score: ${passedTests}/${tests.length} (${((passedTests / tests.length) * 100).toFixed(1)}%)`);
  
  if (passedTests === tests.length) {
    console.log('\n🎉 ALL STRESS TESTS PASSED! System performs well under load.');
  } else {
    console.log(`\n⚠️  ${tests.length - passedTests} stress test(s) failed. Review performance bottlenecks.`);
  }
  
  console.log('='.repeat(80) + '\n');
  
  process.exit(passedTests === tests.length ? 0 : 1);
}

main().catch(error => {
  console.error('\n💥 FATAL ERROR:', error);
  process.exit(1);
});
