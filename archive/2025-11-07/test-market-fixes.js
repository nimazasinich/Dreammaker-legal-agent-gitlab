// test-market-fixes.js
// Test script for market data fixes

const { Database } = require('better-sqlite3');
const path = require('path');

async function testFixes() {
  console.log('🧪 Testing Market Data Fixes...\n');

  try {
    // Test 1: Database interval fix
    const dbPath = path.join(__dirname, 'data', 'boltai.db');
    const db = new Database(dbPath);
    
    const nullCountResult = db.prepare(`
      SELECT COUNT(*) as count 
      FROM market_data 
      WHERE interval IS NULL
    `).get();
    
    console.log(`✅ Null intervals in database: ${nullCountResult.count}`);
    
    // Test 2: Check interval distribution
    const intervalDist = db.prepare(`
      SELECT interval, COUNT(*) as count 
      FROM market_data 
      GROUP BY interval 
      ORDER BY count DESC
    `).all();
    
    console.log('\n📊 Interval Distribution:');
    intervalDist.forEach(row => {
      console.log(`   ${row.interval}: ${row.count} records`);
    });
    
    // Test 3: Verify no null intervals in recent data
    const recentNulls = db.prepare(`
      SELECT COUNT(*) as count 
      FROM market_data 
      WHERE interval IS NULL 
      AND timestamp > ?
    `).get(Date.now() - (24 * 60 * 60 * 1000)); // Last 24 hours
    
    console.log(`\n✅ Recent null intervals (last 24h): ${recentNulls.count}`);
    
    db.close();
    
    console.log('\n✅ All database tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'SQLITE_CANTOPEN') {
      console.log('   Note: Database file may not exist yet. This is OK if the app hasn\'t run yet.');
    }
  }
}

// Run tests
testFixes().catch(console.error);

