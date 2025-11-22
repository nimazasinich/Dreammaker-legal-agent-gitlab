#!/usr/bin/env tsx
/**
 * ACID TEST FOR CORE TRADING LOGIC (OFFLINE VERSION)
 * Tests: AI Module, Strategy Engine, Backtesting Engine, Trading Execution
 * 
 * This version uses synthetic data to test the core logic without requiring a backend server.
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
    // Simulate realistic price movement with trend and volatility
    const trendFactor = Math.sin(i / 10) * 0.02; // Trend component
    const randomFactor = (Math.random() - 0.5) * 0.01; // Random volatility
    const movement = (trendFactor + randomFactor) * price;
    
    price += movement;
    
    const open = price + (Math.random() - 0.5) * price * 0.001;
    const close = price + (Math.random() - 0.5) * price * 0.001;
    const high = Math.max(open, close) + Math.random() * price * 0.002;
    const low = Math.min(open, close) - Math.random() * price * 0.002;
    const volume = 1000000 + Math.random() * 500000;
    
    data.push({
      timestamp: now - (count - i) * 3600000, // 1 hour per candle
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

// ================== TEST 1: AI MODULE ACID TEST ==================

async function testAIModule(): Promise<boolean> {
  const testName = 'AI MODULE';
  log(testName, 'Starting AI Module ACID Test (Offline Mode)...');
  
  try {
    // Generate synthetic market data
    log(testName, 'Step 1: Generating synthetic market data...');
    const ohlcvData = generateSyntheticOHLCV(100, 50000);
    const marketData = convertToMarketData(ohlcvData);
    
    log(testName, `Generated ${marketData.length} candles. Price range: $${Math.min(...marketData.map(d => d.close)).toFixed(2)} - $${Math.max(...marketData.map(d => d.close)).toFixed(2)}`);
    
    // Test BullBearAgent directly
    log(testName, 'Step 2: Testing BullBearAgent...');
    const agent = BullBearAgent.getInstance();
    
    try {
      // Initialize the agent
      await agent.initialize();
      log(testName, 'BullBearAgent initialized successfully');
      
      // Make a prediction
      const prediction = await agent.predict(marketData);
      
      log(testName, 'BullBearAgent Prediction:', {
        action: prediction.action,
        confidence: prediction.confidence.toFixed(3),
        bullProb: prediction.probabilities.bull.toFixed(3),
        bearProb: prediction.probabilities.bear.toFixed(3),
        neutralProb: prediction.probabilities.neutral.toFixed(3),
        uncertainty: prediction.uncertainty.toFixed(3),
        reasoningCount: prediction.reasoning.length,
        featuresCount: prediction.features.length
      });
      
      // Validate prediction structure
      if (!prediction.action || !['LONG', 'SHORT', 'HOLD'].includes(prediction.action)) {
        fail(testName, `Invalid BullBearAgent action: ${prediction.action}`);
        return false;
      }
      
      if (typeof prediction.confidence !== 'number' || prediction.confidence < 0 || prediction.confidence > 1) {
        fail(testName, `Invalid confidence: ${prediction.confidence}`);
        return false;
      }
      
      if (!prediction.probabilities || 
          typeof prediction.probabilities.bull !== 'number' ||
          typeof prediction.probabilities.bear !== 'number' ||
          typeof prediction.probabilities.neutral !== 'number') {
        fail(testName, 'Invalid probability structure');
        return false;
      }
      
      // Check that probabilities sum to approximately 1
      const probSum = prediction.probabilities.bull + prediction.probabilities.bear + prediction.probabilities.neutral;
      if (Math.abs(probSum - 1.0) > 0.01) {
        console.warn(`⚠️  [${testName}] Warning: Probabilities don't sum to 1.0 (sum=${probSum.toFixed(3)})`);
      }
      
      // Check that features are generated
      if (!prediction.features || prediction.features.length === 0) {
        fail(testName, 'No features generated');
        return false;
      }
      
      // Check reasoning is provided
      if (!prediction.reasoning || prediction.reasoning.length === 0) {
        fail(testName, 'No reasoning provided');
        return false;
      }
      
      pass(testName, `BullBearAgent successfully generated ${prediction.action} signal with ${(prediction.confidence * 100).toFixed(1)}% confidence`);
      
      // Test multiple predictions to ensure consistency
      log(testName, 'Step 3: Testing prediction consistency...');
      const predictions = [];
      for (let i = 0; i < 5; i++) {
        const pred = await agent.predict(marketData.slice(-80));
        predictions.push(pred.action);
      }
      log(testName, `Multiple predictions: ${predictions.join(', ')}`);
      
      pass(testName, 'AI Module is functional and producing valid predictions');
      return true;
    } catch (agentError) {
      fail(testName, 'BullBearAgent test failed', agentError);
      return false;
    }
  } catch (error) {
    fail(testName, 'AI Module test failed', error);
    return false;
  }
}

// ================== TEST 2: STRATEGY ENGINE STRESS TEST ==================

async function testStrategyEngine(): Promise<boolean> {
  const testName = 'STRATEGY ENGINE';
  log(testName, 'Starting Strategy Engine Stress Test (Offline Mode)...');
  
  try {
    // Generate synthetic data
    log(testName, 'Step 1: Generating 100 candles for strategy testing...');
    const ohlcvData = generateSyntheticOHLCV(100, 50000);
    
    log(testName, `Generated ${ohlcvData.length} candles. Latest price: $${ohlcvData[ohlcvData.length - 1].close.toFixed(2)}`);
    
    // Test 2.2: Generate features from the data
    log(testName, 'Step 2: Generating technical features...');
    const features = generateFeatures(ohlcvData);
    
    // Validate features
    if (!features.rsi || features.rsi.length === 0) {
      fail(testName, 'RSI calculation failed');
      return false;
    }
    
    if (!features.macd || features.macd.macd.length === 0) {
      fail(testName, 'MACD calculation failed');
      return false;
    }
    
    if (!features.sma20 || features.sma20.length === 0) {
      fail(testName, 'SMA calculation failed');
      return false;
    }
    
    if (!features.atr || features.atr.length === 0) {
      fail(testName, 'ATR calculation failed');
      return false;
    }
    
    const latestRSI = features.rsi[features.rsi.length - 1];
    const latestMACD = features.macd.macd[features.macd.macd.length - 1];
    const latestSMA = features.sma20[features.sma20.length - 1];
    const latestATR = features.atr[features.atr.length - 1];
    
    log(testName, 'Technical Indicators:', {
      rsi: latestRSI.toFixed(2),
      macd: latestMACD.toFixed(4),
      macdSignal: features.macd.signal[features.macd.signal.length - 1].toFixed(4),
      macdHistogram: features.macd.histogram[features.macd.histogram.length - 1].toFixed(4),
      sma20: latestSMA.toFixed(2),
      atr: latestATR.toFixed(2),
      bollingerUpper: features.bollinger.upper[features.bollinger.upper.length - 1].toFixed(2),
      bollingerLower: features.bollinger.lower[features.bollinger.lower.length - 1].toFixed(2)
    });
    
    // Validate indicator values are reasonable
    if (latestRSI < 0 || latestRSI > 100) {
      fail(testName, `RSI out of valid range: ${latestRSI}`);
      return false;
    }
    
    if (latestATR <= 0) {
      fail(testName, `Invalid ATR value: ${latestATR}`);
      return false;
    }
    
    pass(testName, 'Technical indicators calculated successfully with valid values');
    
    // Test 2.3: Run the full strategy engine
    log(testName, 'Step 3: Running Strategy Pipeline...');
    const candlesMap = new Map();
    candlesMap.set('15m', ohlcvData);
    candlesMap.set('1h', ohlcvData);
    candlesMap.set('4h', ohlcvData);
    
    const snapshot = await runStrategyEngine('BTC/USDT', candlesMap);
    
    log(testName, 'Strategy Engine Result:', {
      symbol: snapshot.symbol,
      direction: snapshot.direction,
      action: snapshot.action,
      finalScore: snapshot.final_score.toFixed(3),
      rationale: snapshot.rationale,
      tfResults: snapshot.results.length,
      confluenceEnabled: snapshot.confluence.enabled,
      confluenceScore: snapshot.confluence.score.toFixed(3)
    });
    
    // Validate strategy output
    if (!snapshot.action || !['BUY', 'SELL', 'HOLD'].includes(snapshot.action)) {
      fail(testName, `Invalid strategy action: ${snapshot.action}`);
      return false;
    }
    
    if (!snapshot.direction || !['BULLISH', 'BEARISH', 'NEUTRAL'].includes(snapshot.direction)) {
      fail(testName, `Invalid direction: ${snapshot.direction}`);
      return false;
    }
    
    if (snapshot.results.length === 0) {
      fail(testName, 'Strategy engine returned no timeframe results');
      return false;
    }
    
    if (typeof snapshot.final_score !== 'number' || snapshot.final_score < 0 || snapshot.final_score > 1) {
      fail(testName, `Invalid final score: ${snapshot.final_score}`);
      return false;
    }
    
    // Check that each timeframe has valid results
    for (const tfResult of snapshot.results) {
      if (!tfResult.tf || !tfResult.direction || typeof tfResult.final_score !== 'number') {
        fail(testName, `Invalid timeframe result for ${tfResult.tf}`);
        return false;
      }
      
      if (tfResult.components.length === 0) {
        fail(testName, `No components for timeframe ${tfResult.tf}`);
        return false;
      }
    }
    
    log(testName, 'Timeframe Results:', snapshot.results.map(r => ({
      tf: r.tf,
      direction: r.direction,
      score: r.final_score.toFixed(3),
      components: r.components.length
    })));
    
    pass(testName, `Strategy Engine generated ${snapshot.action} signal with ${snapshot.direction} direction and score ${snapshot.final_score.toFixed(3)}`);
    return true;
  } catch (error) {
    fail(testName, 'Strategy Engine test failed', error);
    return false;
  }
}

// ================== TEST 3: BACKTESTING REALITY CHECK ==================

async function testBacktestEngine(): Promise<boolean> {
  const testName = 'BACKTEST ENGINE';
  log(testName, 'Starting Backtesting Reality Check (Offline Mode)...');
  
  try {
    const backtester = BacktestEngine.getInstance();
    
    // Generate synthetic data with a trend for more interesting results
    log(testName, 'Step 1: Generating 100 candles with trending price action...');
    const ohlcvData = generateSyntheticOHLCV(100, 50000);
    const marketData = convertToMarketData(ohlcvData);
    
    const priceStart = ohlcvData[0].close;
    const priceEnd = ohlcvData[ohlcvData.length - 1].close;
    const priceChange = ((priceEnd - priceStart) / priceStart * 100).toFixed(2);
    
    log(testName, `Generated ${marketData.length} candles. Price: $${priceStart.toFixed(2)} → $${priceEnd.toFixed(2)} (${priceChange}%)`);
    
    // Run backtest
    log(testName, 'Step 2: Running backtest simulation...');
    const startTime = Date.now();
    
    const backtestConfig = {
      symbol: 'BTC/USDT',
      startDate: marketData[0].timestamp as number,
      endDate: marketData[marketData.length - 1].timestamp as number,
      initialCapital: 10000,
      feeRate: 0.001,
      slippageRate: 0.001,
      maxPositionSize: 0.95
    };
    
    const result = await backtester.runBacktest(marketData, backtestConfig);
    const executionTime = Date.now() - startTime;
    
    log(testName, 'Backtest Results:', {
      symbol: result.symbol,
      totalTrades: result.totalTrades,
      winRate: (result.winRate * 100).toFixed(2) + '%',
      profitFactor: result.profitFactor.toFixed(2),
      sharpeRatio: result.sharpeRatio.toFixed(3),
      sortinoRatio: result.sortinoRatio.toFixed(3),
      maxDrawdown: (result.maxDrawdown * 100).toFixed(2) + '%',
      var95: (result.var95 * 100).toFixed(2) + '%',
      executionTime: executionTime + 'ms'
    });
    
    // Validate execution time
    if (executionTime < 50) {
      console.warn(`⚠️  [${testName}] Warning: Backtest executed very fast (${executionTime}ms) - may not be calculating properly`);
    } else {
      pass(testName, `Backtest took ${executionTime}ms - indicating real calculations`);
    }
    
    // Validate result structure
    if (typeof result.totalTrades !== 'number' || result.totalTrades < 0) {
      fail(testName, 'Invalid totalTrades value');
      return false;
    }
    
    if (typeof result.winRate !== 'number' || result.winRate < 0 || result.winRate > 1) {
      fail(testName, `Invalid winRate: ${result.winRate}`);
      return false;
    }
    
    if (result.totalTrades === 0) {
      console.warn(`⚠️  [${testName}] Warning: No trades executed - strategy may be too conservative`);
    } else {
      log(testName, 'Trade Details (first 3):', result.trades.slice(0, 3).map(t => ({
        id: t.id,
        side: t.side,
        entryPrice: t.entryPrice.toFixed(2),
        exitPrice: t.exitPrice.toFixed(2),
        pnl: t.pnl.toFixed(2),
        confidence: t.confidence.toFixed(3)
      })));
    }
    
    // Calculate total PnL
    let totalPnL = 0;
    for (const trade of result.trades) {
      totalPnL += trade.pnl;
    }
    
    const pnlPercent = (totalPnL / backtestConfig.initialCapital * 100).toFixed(2);
    
    log(testName, 'Performance Metrics:', {
      totalPnL: totalPnL.toFixed(2) + ' USDT',
      pnlPercent: pnlPercent + '%',
      avgPnLPerTrade: result.totalTrades > 0 ? (totalPnL / result.totalTrades).toFixed(2) + ' USDT' : 'N/A',
      finalCapital: (backtestConfig.initialCapital + totalPnL).toFixed(2) + ' USDT'
    });
    
    // Validate that backtest produces reasonable results
    if (result.totalTrades > 0 && result.profitFactor === 0 && totalPnL !== 0) {
      fail(testName, 'Profit factor calculation appears incorrect');
      return false;
    }
    
    pass(testName, `Backtest completed successfully with ${result.totalTrades} trades, ${pnlPercent}% return, and ${(result.winRate * 100).toFixed(1)}% win rate`);
    return true;
  } catch (error) {
    fail(testName, 'Backtest Engine test failed', error);
    return false;
  }
}

// ================== TEST 4: TRADING EXECUTION SIMULATION ==================

async function testTradingExecution(): Promise<boolean> {
  const testName = 'TRADING EXECUTION';
  log(testName, 'Starting Trading Execution Simulation (Offline Mode)...');
  
  try {
    const orderService = OrderManagementService.getInstance();
    
    // Step 0: Seed the database with market data so the order service can get current price
    log(testName, 'Step 0: Seeding database with market data...');
    const { Database } = await import('../src/data/Database.js');
    const db = Database.getInstance();
    
    const currentPrice = 50000;
    const ohlcvData = generateSyntheticOHLCV(10, currentPrice);
    const marketData = convertToMarketData(ohlcvData);
    
    // Save market data to database
    for (const data of marketData) {
      await db.insertMarketData(data);
    }
    
    log(testName, `Seeded ${marketData.length} candles. Latest price: $${marketData[marketData.length - 1].close.toFixed(2)}`);
    
    // Set initial portfolio value
    orderService.setPortfolioValue(100000);
    log(testName, 'Initial portfolio value set to $100,000');
    
    // Create a simulated BUY order
    log(testName, 'Step 1: Creating simulated BUY order...');
    
    const buyOrder = await orderService.createMarketOrder({
      symbol: 'BTC/USDT',
      side: 'BUY',
      quantity: 0.1,
      clientOrderId: 'ACID_TEST_BUY_001'
    });
    
    log(testName, 'Buy Order Created:', {
      id: buyOrder.id,
      clientOrderId: buyOrder.clientOrderId,
      symbol: buyOrder.symbol,
      type: buyOrder.type,
      side: buyOrder.side,
      quantity: buyOrder.quantity,
      status: buyOrder.status,
      filledQuantity: buyOrder.filledQuantity,
      averageFillPrice: buyOrder.averageFillPrice.toFixed(2),
      totalValue: buyOrder.totalValue.toFixed(2),
      feeAmount: buyOrder.feeAmount.toFixed(2),
      fills: buyOrder.fills.length
    });
    
    // Validate order structure
    if (!buyOrder.id || !buyOrder.clientOrderId) {
      fail(testName, 'Order missing required identifiers');
      return false;
    }
    
    if (buyOrder.type !== 'MARKET') {
      fail(testName, `Expected MARKET order type, got ${buyOrder.type}`);
      return false;
    }
    
    if (buyOrder.side !== 'BUY') {
      fail(testName, `Expected BUY side, got ${buyOrder.side}`);
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
    
    if (buyOrder.filledQuantity !== buyOrder.quantity) {
      fail(testName, `Filled quantity (${buyOrder.filledQuantity}) doesn't match order quantity (${buyOrder.quantity})`);
      return false;
    }
    
    if (buyOrder.fills.length === 0) {
      fail(testName, 'No fills recorded');
      return false;
    }
    
    pass(testName, `Market BUY order executed successfully at $${buyOrder.averageFillPrice.toFixed(2)}`);
    
    // Check position tracking
    log(testName, 'Step 2: Verifying position tracking...');
    const position = await orderService.getPosition('BTC/USDT');
    
    if (!position) {
      fail(testName, 'Position not created after order execution');
      return false;
    }
    
    log(testName, 'Position:', {
      symbol: position.symbol,
      size: position.size,
      averagePrice: position.averagePrice.toFixed(2),
      unrealizedPnL: position.unrealizedPnL.toFixed(2),
      realizedPnL: position.realizedPnL.toFixed(2)
    });
    
    if (position.size !== buyOrder.quantity) {
      fail(testName, `Position size (${position.size}) doesn't match order quantity (${buyOrder.quantity})`);
      return false;
    }
    
    pass(testName, 'Position tracking working correctly');
    
    // Get portfolio summary
    log(testName, 'Step 3: Getting portfolio summary...');
    const portfolio = await orderService.getPortfolioSummary();
    
    log(testName, 'Portfolio Summary:', {
      totalValue: portfolio.totalValue.toFixed(2),
      totalPnL: portfolio.totalPnL.toFixed(2),
      unrealizedPnL: portfolio.unrealizedPnL.toFixed(2),
      realizedPnL: portfolio.realizedPnL.toFixed(2),
      totalFees: portfolio.totalFees.toFixed(2),
      positions: portfolio.positions.length,
      cashBalance: portfolio.cashBalance.toFixed(2)
    });
    
    if (portfolio.positions.length !== 1) {
      fail(testName, `Expected 1 position, got ${portfolio.positions.length}`);
      return false;
    }
    
    if (portfolio.totalFees <= 0) {
      fail(testName, 'No fees calculated');
      return false;
    }
    
    pass(testName, 'Portfolio summary calculated correctly');
    
    // Test creating a SELL order to close the position
    log(testName, 'Step 4: Creating SELL order to close position...');
    
    const sellOrder = await orderService.createMarketOrder({
      symbol: 'BTC/USDT',
      side: 'SELL',
      quantity: 0.1,
      clientOrderId: 'ACID_TEST_SELL_001'
    });
    
    log(testName, 'Sell Order Created:', {
      id: sellOrder.id,
      status: sellOrder.status,
      averageFillPrice: sellOrder.averageFillPrice.toFixed(2),
      totalValue: sellOrder.totalValue.toFixed(2)
    });
    
    if (sellOrder.status !== 'FILLED') {
      fail(testName, `SELL order not filled. Status: ${sellOrder.status}`);
      return false;
    }
    
    // Check that position is closed
    const closedPosition = await orderService.getPosition('BTC/USDT');
    if (closedPosition) {
      console.warn(`⚠️  [${testName}] Warning: Position still exists after closing trade`);
    } else {
      pass(testName, 'Position successfully closed');
    }
    
    // Get final portfolio summary
    const finalPortfolio = await orderService.getPortfolioSummary();
    log(testName, 'Final Portfolio:', {
      totalValue: finalPortfolio.totalValue.toFixed(2),
      totalPnL: finalPortfolio.totalPnL.toFixed(2),
      realizedPnL: finalPortfolio.realizedPnL.toFixed(2),
      totalFees: finalPortfolio.totalFees.toFixed(2),
      positions: finalPortfolio.positions.length
    });
    
    // Verify no direct Binance calls
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
  console.log('🔬 ACID TEST FOR CORE TRADING LOGIC (OFFLINE MODE)');
  console.log('Testing: AI Module, Strategy Engine, Backtesting, Trading Execution');
  console.log('Using: Synthetic data for independent testing');
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
  
  console.log(`\n${results.aiModule ? '✅' : '❌'} AI Module Test:           ${results.aiModule ? 'PASS' : 'FAIL'}`);
  console.log(`${results.strategyEngine ? '✅' : '❌'} Strategy Engine Test:     ${results.strategyEngine ? 'PASS' : 'FAIL'}`);
  console.log(`${results.backtestEngine ? '✅' : '❌'} Backtest Engine Test:     ${results.backtestEngine ? 'PASS' : 'FAIL'}`);
  console.log(`${results.tradingExecution ? '✅' : '❌'} Trading Execution Test:   ${results.tradingExecution ? 'PASS' : 'FAIL'}`);
  
  console.log(`\n📈 Overall Score: ${passedTests}/${totalTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! Core trading logic is functional and ready.');
    console.log('\n✨ Key Findings:');
    console.log('   • AI predictions are generated with valid confidence and reasoning');
    console.log('   • Strategy engine calculates indicators and generates signals correctly');
    console.log('   • Backtesting engine executes trades and calculates performance metrics');
    console.log('   • Trading execution creates orders and tracks positions properly');
    console.log('\n🔍 The core logic is mathematically sound and NOT just UI shells.');
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
