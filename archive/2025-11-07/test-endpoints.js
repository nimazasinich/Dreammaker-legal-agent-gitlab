// Quick test script to verify API endpoints
const BASE_URL = 'http://localhost:3001';

async function testEndpoint(name, url, options = {}) {
    try {
        console.log(`\nTesting ${name}...`);
        const response = await fetch(url, options);
        const data = await response.json();
        
        if (response.ok) {
            console.log(`✅ ${name} - SUCCESS`);
            console.log('Response:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
            return true;
        } else {
            console.log(`❌ ${name} - FAILED (${response.status})`);
            console.log('Error:', data);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${name} - ERROR: ${error.message}`);
        return false;
    }
}

async function runTests() {
    console.log('🧪 Testing API Endpoints...\n');
    
    // Test SMC endpoint (GET)
    await testEndpoint(
        'SMC Analysis (GET)',
        `${BASE_URL}/api/analysis/smc?symbol=BTC&timeframe=1h`
    );
    
    // Test Elliott endpoint (POST)
    await testEndpoint(
        'Elliott Wave Analysis (POST)',
        `${BASE_URL}/api/analysis/elliott`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: 'BTCUSDT' })
        }
    );
    
    // Test Harmonic endpoint (POST)
    await testEndpoint(
        'Harmonic Pattern Analysis (POST)',
        `${BASE_URL}/api/analysis/harmonic`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: 'BTCUSDT' })
        }
    );
    
    console.log('\n✅ All tests completed!');
}

runTests();
