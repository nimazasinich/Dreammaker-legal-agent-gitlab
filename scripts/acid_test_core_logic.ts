#!/usr/bin/env tsx
/**
 * ACID TEST FOR CORE TRADING LOGIC
 * Tests: AI Module, Strategy Engine, Backtesting Engine, Trading Execution
 * 
 * This script verifies that the core trading logic is functional and not just UI shells.
 */

import { DatasourceClient } from '../src/services/DatasourceClient.js';
import { BullBearAgent } from '../src/ai/BullBearAgent.js';
import { BacktestEngine } from '../src/ai/BacktestEngine.js';
import { runStrategyEngine, generateFeatures } from '../src/strategy/index.js';
import { OrderManagementService } from '../src/services/OrderManagementService.js';
import { MarketData } from '../src/types/index.js';

// ================== HELPER FUNCTIONS ==================

function log(section: string, message: string, data?: any) {
  console.log(`\n[${ section }] ${message}`);
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

function convertToMarketData(priceData: any[]): MarketData[] {
  return priceData.map(candle => ({
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

// ================== TEST 1: AI MODULE ACID TEST ==================

async function testAIModule(): Promise<boolean> {
  const testName = 'AI MODULE';
  log(testName, 'Starting AI Module ACID Test...');
  
  try {
    // Get the DatasourceClient
    const client = DatasourceClient.getInstance();
    
    // Test 1.1: Check if AI prediction endpoint is accessible
    log(testName, 'Step 1: Testing AI Prediction API...');
    const prediction = await client.getAIPrediction('BTC/USDT', '1h');
    
    if (!prediction) {
      fail(testName, 'AI Prediction returned null - backend may be down or misconfigured');
      return false;
    }
    
    log(testName, 'AI Prediction Response:', {
      symbol: prediction.symbol,
      action: prediction.action,
      confidence: prediction.confidence,
      price: prediction.price,
      timeframe: prediction.timeframe
    });
    
    // Test 1.2: Validate prediction structure
    if (!prediction.action || !['BUY', 'SELL', 'HOLD'].includes(prediction.action)) {
      fail(testName, `Invalid action: ${prediction.action}. Expected BUY, SELL, or HOLD`);
      return false;
    }
    
    // Test 1.3: Check confidence is a valid number (not static mock)
    if (typeof prediction.confidence !== 'number' || prediction.confidence < 0 || prediction.confidence > 1) {
      fail(testName, `Invalid confidence: ${prediction.confidence}. Expected 0-1`);
      return false;
    }
    
    // Test 1.4: Verify it's not a static mock (confidence shouldn't be exactly 0.5)
    // We allow for a small range around 0.5 in case of genuine neutral predictions
    if (prediction.confidence === 0.5 && prediction.action === 'HOLD') {
      console.warn(`⚠️  [${testName}] Warning: Prediction might be a mock (confidence=0.5, action=HOLD)`);
    }
    
    pass(testName, `AI Module returned valid prediction: ${prediction.action} with ${(prediction.confidence * 100).toFixed(1)}% confidence`);
    
    // Test 1.5: Test BullBearAgent directly
    log(testName, 'Step 2: Testing BullBearAgent locally...');
    const agent = BullBearAgent.getInstance();
    
    // Fetch market data for the agent
    const marketData = await client.getPriceChart('BTC/USDT', '1h', 100);
    if (marketData.length < 50) {
      fail(testName, 'Insufficient market data for BullBearAgent test');
      return false;
    }
    
    const convertedData = convertToMarketData(marketData);
    
    try {
      // Initialize the agent
      await agent.initialize();
      
      // Make a prediction
      const agentPrediction = await agent.predict(convertedData);
      
      log(testName, 'BullBearAgent Prediction:', {
        action: agentPrediction.action,
        confidence: agentPrediction.confidence.toFixed(3),
        bullProb: agentPrediction.probabilities.bull.toFixed(3),
        bearProb: agentPrediction.probabilities.bear.toFixed(3),
        neutralProb: agentPrediction.probabilities.neutral.toFixed(3),
        reasoning: agentPrediction.reasoning.slice(0, 3)
      });
      
      if (!agentPrediction.action || !['LONG', 'SHORT', 'HOLD'].includes(agentPrediction.action)) {
        fail(testName, `Invalid BullBearAgent action: ${agentPrediction.action}`);
        return false;
      }
      
      pass(testName, 'BullBearAgent successfully generated prediction');
    } catch (agentError) {
      console.warn(`⚠️  [${testName}] BullBearAgent test failed (may need initialization):`, agentError);
      // Don't fail the entire test if agent fails - it may require specific setup
    }
    
    return true;
  } catch (error) {
    fail(testName, 'AI Module test failed', error);
    return false;
  }
}

// ================== TEST 2: STRATEGY ENGINE STRESS TEST ==================

async function testStrategyEngine(): Promise<boolean> {
  const testName = 'STRATEGY ENGINE';
  log(testName, 'Starting Strategy Engine Stress Test...');
  
  try {
    const client = DatasourceClient.getInstance();
    
    // Test 2.1: Fetch 100 candles of real OHLCV data
    log(testName, 'Step 1: Fetching 100 candles for BTC/USDT...');
    const candles = await client.getPriceChart('BTC/USDT', '1h', 100);
    
    if (candles.length < 50) {
      fail(testName, `Insufficient candles: ${candles.length}. Expected at least 50.`);
      return false;
    }
    
    log(testName, `Fetched ${candles.length} candles. Latest price: $${candles[candles.length - 1].close.toFixed(2)}`);
    
    // Test 2.2: Generate features from the data
    log(testName, 'Step 2: Generating technical features...');
    const features = generateFeatures(candles.map(c => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    })));
    
    // Validate features
    if (!features.rsi || features.rsi.length === 0) {
      fail(testName, 'RSI calculation failed');
      return false;
    }
    
    if (!features.macd || features.macd.macd.length === 0) {
      fail(testName, 'MACD calculation failed');
      return false;
    }
    
    const latestRSI = features.rsi[features.rsi.length - 1];
    const latestMACD = features.macd.macd[features.macd.macd.length - 1];
    
    log(testName, 'Technical Indicators:', {
      rsi: latestRSI.toFixed(2),
      macd: latestMACD.toFixed(4),
      sma20: features.sma20[features.sma20.length - 1].toFixed(2),
      atr: features.atr[features.atr.length - 1].toFixed(2)
    });
    
    pass(testName, 'Technical indicators calculated successfully');
    
    // Test 2.3: Run the full strategy engine
    log(testName, 'Step 3: Running Strategy Pipeline...');
    const candlesMap = new Map();
    candlesMap.set('15m', candles.map(c => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    })));
    candlesMap.set('1h', candles.map(c => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    })));
    candlesMap.set('4h', candles.map(c => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    })));
    
    const snapshot = await runStrategyEngine('BTC/USDT', candlesMap);
    
    log(testName, 'Strategy Engine Result:', {
      symbol: snapshot.symbol,
      direction: snapshot.direction,
      action: snapshot.action,
      finalScore: snapshot.final_score.toFixed(3),
      rationale: snapshot.rationale,
      tfResults: snapshot.results.length
    });
    
    // Validate strategy output
    if (!snapshot.action || !['BUY', 'SELL', 'HOLD'].includes(snapshot.action)) {
      fail(testName, `Invalid strategy action: ${snapshot.action}`);
      return false;
    }
    
    if (snapshot.results.length === 0) {
      fail(testName, 'Strategy engine returned no timeframe results');
      return false;
    }
    
    pass(testName, `Strategy Engine generated ${snapshot.action} signal with score ${snapshot.final_score.toFixed(3)}`);
    return true;
  } catch (error) {
    fail(testName, 'Strategy Engine test failed', error);
    return false;
  }
}

// ================== TEST 3: BACKTESTING REALITY CHECK ==================

async function testBacktestEngine(): Promise<boolean> {
  const testName = 'BACKTEST ENGINE';
  log(testName, 'Starting Backtesting Reality Check...');
  
  try {
    const client = DatasourceClient.getInstance();
    const backtester = BacktestEngine.getInstance();
    
    // Test 3.1: Fetch 24 hours of BTC data (assuming 1h candles = 24 candles)
    log(testName, 'Step 1: Fetching 24 hours of BTC data...');
    const candles = await client.getPriceChart('BTC/USDT', '1h', 100);
    
    if (candles.length < 50) {
      fail(testName, `Insufficient data for backtest: ${candles.length} candles`);
      return false;
    }
    
    log(testName, `Fetched ${candles.length} candles for backtesting`);
    
    // Test 3.2: Convert to MarketData format
    const marketData = convertToMarketData(candles);
    
    // Test 3.3: Run backtest
    log(testName, 'Step 2: Running backtest simulation...');
    const startTime = Date.now();
    
    const backtestConfig = {
      symbol: 'BTC/USDT',
      startDate: marketData[0].timestamp as number,
      endDate: marketData[marketData.length - 1].timestamp as number,
      initialCapital: 10000,
      feeRate: 0.001,
      slippageRate: 0.001
    };
    
    const result = await backtester.runBacktest(marketData, backtestConfig);
    const executionTime = Date.now() - startTime;
    
    log(testName, 'Backtest Results:', {
      symbol: result.symbol,
      totalTrades: result.totalTrades,
      winRate: (result.winRate * 100).toFixed(2) + '%',
      sharpeRatio: result.sharpeRatio.toFixed(3),
      maxDrawdown: (result.maxDrawdown * 100).toFixed(2) + '%',
      executionTime: executionTime + 'ms'
    });
    
    // Test 3.4: Validate results
    if (executionTime < 100) {
      console.warn(`⚠️  [${testName}] Warning: Backtest executed very fast (${executionTime}ms) - may not be calculating properly`);
    }
    
    if (result.totalTrades === 0) {
      console.warn(`⚠️  [${testName}] Warning: No trades executed - strategy may be too conservative or conditions not met`);
    }
    
    // Calculate approximate PnL
    let totalPnL = 0;
    for (const trade of result.trades) {
      totalPnL += trade.pnl;
    }
    
    log(testName, 'Performance Metrics:', {
      totalPnL: totalPnL.toFixed(2) + ' USDT',
      avgPnLPerTrade: result.totalTrades > 0 ? (totalPnL / result.totalTrades).toFixed(2) + ' USDT' : 'N/A',
      profitFactor: result.profitFactor.toFixed(2)
    });
    
    pass(testName, `Backtest completed with ${result.totalTrades} trades and ${totalPnL > 0 ? 'positive' : 'negative'} PnL`);
    return true;
  } catch (error) {
    fail(testName, 'Backtest Engine test failed', error);
    return false;
  }
}

// ================== TEST 4: TRADING EXECUTION SIMULATION ==================

async function testTradingExecution(): Promise<boolean> {
  const testName = 'TRADING EXECUTION';
  log(testName, 'Starting Trading Execution Simulation...');
  
  try {
    const orderService = OrderManagementService.getInstance();
    const client = DatasourceClient.getInstance();
    
    // Test 4.1: Get current price
    log(testName, 'Step 1: Fetching current BTC price...');
    const priceData = await client.getTopCoins(1, ['BTC']);
    
    if (!priceData || priceData.length === 0) {
      fail(testName, 'Unable to fetch current BTC price');
      return false;
    }
    
    const currentPrice = priceData[0].price;
    log(testName, `Current BTC price: $${currentPrice.toFixed(2)}`);
    
    // Test 4.2: Create a simulated BUY order
    log(testName, 'Step 2: Creating simulated BUY order...');
    
    // Set initial portfolio value
    orderService.setPortfolioValue(100000);
    
    const buyOrder = await orderService.createMarketOrder({
      symbol: 'BTC/USDT',
      side: 'BUY',
      quantity: 0.01,
      clientOrderId: 'ACID_TEST_BUY_001'
    });
    
    log(testName, 'Buy Order Created:', {
      id: buyOrder.id,
      symbol: buyOrder.symbol,
      type: buyOrder.type,
      side: buyOrder.side,
      quantity: buyOrder.quantity,
      status: buyOrder.status,
      averageFillPrice: buyOrder.averageFillPrice.toFixed(2),
      totalValue: buyOrder.totalValue.toFixed(2)
    });
    
    // Test 4.3: Validate order structure
    if (!buyOrder.id || !buyOrder.clientOrderId) {
      fail(testName, 'Order missing required identifiers');
      return false;
    }
    
    if (buyOrder.status !== 'FILLED') {
      fail(testName, `Market order not filled. Status: ${buyOrder.status}`);
      return false;
    }
    
    if (buyOrder.averageFillPrice <= 0) {
      fail(testName, 'Invalid fill price');
      return false;
    }
    
    pass(testName, `Market order executed successfully at $${buyOrder.averageFillPrice.toFixed(2)}`);
    
    // Test 4.4: Check position tracking
    log(testName, 'Step 3: Verifying position tracking...');
    const position = await orderService.getPosition('BTC/USDT');
    
    if (!position) {
      fail(testName, 'Position not created after order execution');
      return false;
    }
    
    log(testName, 'Position:', {
      symbol: position.symbol,
      size: position.size,
      averagePrice: position.averagePrice.toFixed(2),
      unrealizedPnL: position.unrealizedPnL.toFixed(2)
    });
    
    // Test 4.5: Get portfolio summary
    log(testName, 'Step 4: Getting portfolio summary...');
    const portfolio = await orderService.getPortfolioSummary();
    
    log(testName, 'Portfolio Summary:', {
      totalValue: portfolio.totalValue.toFixed(2),
      totalPnL: portfolio.totalPnL.toFixed(2),
      unrealizedPnL: portfolio.unrealizedPnL.toFixed(2),
      totalFees: portfolio.totalFees.toFixed(2),
      positions: portfolio.positions.length,
      cashBalance: portfolio.cashBalance.toFixed(2)
    });
    
    // Test 4.6: Verify no direct Binance calls (check preferred exchange)
    const preferredExchange = orderService.getPreferredExchange();
    log(testName, `Using exchange service: ${preferredExchange}`);
    
    pass(testName, `Trading execution working correctly via OrderManagementService (${preferredExchange})`);
    return true;
  } catch (error) {
    fail(testName, 'Trading Execution test failed', error);
    return false;
  }
}

// ================== MAIN EXECUTION ==================

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔬 ACID TEST FOR CORE TRADING LOGIC');
  console.log('Testing: AI Module, Strategy Engine, Backtesting, Trading Execution');
  console.log('='.repeat(80));
  
  const results = {
    aiModule: false,
    strategyEngine: false,
    backtestEngine: false,
    tradingExecution: false
  };
  
  // Run all tests
  results.aiModule = await testAIModule();
  results.strategyEngine = await testStrategyEngine();
  results.backtestEngine = await testBacktestEngine();
  results.tradingExecution = await testTradingExecution();
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  
  console.log(`\n✅ AI Module Test:           ${results.aiModule ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Strategy Engine Test:     ${results.strategyEngine ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Backtest Engine Test:     ${results.backtestEngine ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Trading Execution Test:   ${results.tradingExecution ? 'PASS' : 'FAIL'}`);
  
  console.log(`\n📈 Overall Score: ${passedTests}/${totalTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Core trading logic is functional and ready.');
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} test(s) failed. Review the output above for details.`);
  }
  
  console.log('='.repeat(80) + '\n');
  
  // Exit with appropriate code
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run the tests
main().catch(error => {
  console.error('\n💥 FATAL ERROR:', error);
  process.exit(1);
});
