// Complete Integration Test
// This script tests all API connections

const API_BASE = 'http://localhost:3001/api';

console.log('🧪 Starting Integration Tests...\n');

async function testEndpoint(name, url, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${url}`, options);
        const data = await response.json();
        console.log(`✅ ${name}: SUCCESS`);
        console.log(`   Response:`, JSON.stringify(data).substring(0, 100) + '...\n');
        return true;
    } catch (error) {
        console.log(`❌ ${name}: FAILED`);
        console.log(`   Error: ${error.message}\n`);
        return false;
    }
}

async function runTests() {
    let passed = 0;
    let failed = 0;

    console.log('📡 Testing Backend Connection...\n');
    
    // Test 1: Health Check
    if (await testEndpoint('Health Check', '/health')) passed++; else failed++;
    
    // Test 2: Market Prices
    if (await testEndpoint('Market Prices', '/market/prices?symbols=BTC,ETH')) passed++; else failed++;
    
    // Test 3: Settings Get
    if (await testEndpoint('Settings Get', '/settings')) passed++; else failed++;
    
    // Test 4: Settings Post
    if (await testEndpoint('Settings Post', '/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: 'dark', emailNotifications: true })
    })) passed++; else failed++;
    
    // Test 5: Market Data
    if (await testEndpoint('Market Data', '/market-data/BTC')) passed++; else failed++;
    
    // Test 6: Signal Analysis
    if (await testEndpoint('Signal Analysis', '/signals/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'BTCUSDT', timeframe: '1h', bars: 100 })
    })) passed++; else failed++;
    
    // Test 7: Harmonic Patterns
    if (await testEndpoint('Harmonic Patterns', '/analysis/harmonic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'BTCUSDT' })
    })) passed++; else failed++;
    
    // Test 8: Smart Money Concepts
    if (await testEndpoint('Smart Money Concepts', '/analysis/smc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: 'BTCUSDT' })
    })) passed++; else failed++;

    // Test Results
    console.log('='.repeat(50));
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);
    
    if (failed === 0) {
        console.log('🎉 All tests passed! Integration is working perfectly!');
    } else {
        console.log('⚠️  Some tests failed. Check if backend is running on port 3001');
        console.log('   Run: npm run dev:real');
    }
}

// Run tests
runTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    console.log('\n⚠️  Make sure the backend is running:');
    console.log('   npm run dev:real');
});
