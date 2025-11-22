#!/usr/bin/env tsx
/**
 * BACKEND DATA SEEDING SCRIPT
 * Seeds the backend database with OHLCV data for integration testing
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:8001';

interface OHLCVCandle {
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  interval: string;
}

// Generate realistic OHLCV data
function generateOHLCV(count: number, basePrice: number = 84000): OHLCVCandle[] {
  const candles: OHLCVCandle[] = [];
  let price = basePrice;
  const now = Date.now();
  
  for (let i = count - 1; i >= 0; i--) {
    // Simulate realistic price movement
    const trendFactor = Math.sin((count - i) / 20) * 0.01;
    const randomFactor = (Math.random() - 0.5) * 0.005;
    const movement = (trendFactor + randomFactor) * price;
    
    price += movement;
    
    const open = price + (Math.random() - 0.5) * price * 0.001;
    const close = price + (Math.random() - 0.5) * price * 0.001;
    const high = Math.max(open, close) + Math.random() * price * 0.002;
    const low = Math.min(open, close) - Math.random() * price * 0.002;
    const volume = 50000000 + Math.random() * 20000000; // 50-70M volume
    
    candles.push({
      symbol: 'BTC',
      timestamp: now - (i * 3600000), // 1 hour intervals
      open,
      high,
      low,
      close,
      volume,
      interval: '1h'
    });
  }
  
  return candles;
}

async function seedData() {
  console.log('🌱 Starting backend data seeding...\n');
  
  try {
    // Check if backend is running
    console.log('1️⃣ Checking backend connectivity...');
    const healthCheck = await axios.get(`${API_BASE}/api/market?limit=1`, {
      timeout: 5000
    });
    
    if (healthCheck.status !== 200) {
      throw new Error('Backend not responding');
    }
    console.log('✅ Backend is running\n');
    
    // Generate OHLCV data
    console.log('2️⃣ Generating synthetic OHLCV data...');
    const candles = generateOHLCV(150, 84000); // Generate 150 candles
    console.log(`✅ Generated ${candles.length} candles\n`);
    
    // Check current data count
    console.log('3️⃣ Checking existing data...');
    const historyResponse = await axios.get(
      `${API_BASE}/api/market/history?symbol=BTC&timeframe=1h&limit=200`
    );
    
    const existingCount = historyResponse.data?.history?.length || 0;
    console.log(`   Current candles in DB: ${existingCount}`);
    
    if (existingCount >= 100) {
      console.log('✅ Database already has sufficient data (>= 100 candles)\n');
      return;
    }
    
    // Seed data through market ingestion endpoint (if available)
    console.log('\n4️⃣ Seeding data to backend...');
    
    // Try to use a bulk insert endpoint if available
    try {
      await axios.post(`${API_BASE}/api/market/seed`, {
        candles: candles
      }, {
        timeout: 30000
      });
      console.log('✅ Data seeded via bulk endpoint\n');
    } catch (bulkError) {
      // If bulk endpoint doesn't exist, insert one by one
      console.log('   Bulk endpoint not available, inserting individually...');
      
      let inserted = 0;
      for (const candle of candles) {
        try {
          await axios.post(`${API_BASE}/api/market/ingest`, candle, {
            timeout: 5000
          });
          inserted++;
          
          if (inserted % 20 === 0) {
            console.log(`   Inserted ${inserted}/${candles.length} candles...`);
          }
        } catch (insertError) {
          // Continue even if some inserts fail
        }
      }
      
      console.log(`✅ Inserted ${inserted}/${candles.length} candles\n`);
    }
    
    // Verify seeding
    console.log('5️⃣ Verifying data seeding...');
    const verifyResponse = await axios.get(
      `${API_BASE}/api/market/history?symbol=BTC&timeframe=1h&limit=200`
    );
    
    const finalCount = verifyResponse.data?.history?.length || 0;
    console.log(`   Final candle count: ${finalCount}`);
    
    if (finalCount >= 50) {
      console.log('✅ Sufficient data available for AI predictions\n');
    } else {
      console.log('⚠️  Warning: Still insufficient data for AI predictions\n');
    }
    
    // Test AI prediction endpoint
    console.log('6️⃣ Testing AI prediction endpoint...');
    try {
      const predictionResponse = await axios.post(
        `${API_BASE}/api/ai/predict`,
        {
          symbol: 'BTC',
          timeframe: '1h'
        },
        {
          timeout: 30000
        }
      );
      
      if (predictionResponse.data.error) {
        console.log(`⚠️  AI Prediction Error: ${predictionResponse.data.error}\n`);
      } else {
        console.log('✅ AI prediction endpoint working!');
        console.log(`   Action: ${predictionResponse.data.action}`);
        console.log(`   Confidence: ${(predictionResponse.data.confidence * 100).toFixed(1)}%\n`);
      }
    } catch (predError: any) {
      console.log(`⚠️  AI Prediction test failed: ${predError.response?.data?.error || predError.message}\n`);
    }
    
    console.log('✅ Data seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Candles generated: ${candles.length}`);
    console.log(`   - Candles in DB: ${finalCount}`);
    console.log(`   - Ready for testing: ${finalCount >= 50 ? 'YES ✅' : 'NO ❌'}\n`);
    
  } catch (error: any) {
    console.error('\n❌ Data seeding failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run seeding
seedData().then(() => {
  console.log('🎉 Seeding script completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
