const API_BASE = 'http://localhost:3001/api';

async function testEndpoint(name, url, method = 'GET', body = null) {
  try {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    const data = await response.json();
    
    if (data.success && data.data) {
      console.log(`✓ ${name}: PASS - Source: ${data.source || 'N/A'}`);
      return true;
    } else {
      console.log(`✗ ${name}: FAIL - No data returned`);
      return false;
    }
  } catch (error) {
    console.log(`✗ ${name}: ERROR - ${error.message}`);
    return false;
  }
}

async function runVerification() {
  console.log('\n🚀 STARTING REAL DATA VERIFICATION\n');
  
  const tests = [];
  
  console.log('📊 Testing Market Data...');
  tests.push(await testEndpoint('Market Prices', `${API_BASE}/market/prices?symbols=BTC,ETH`));
  tests.push(await testEndpoint('Market Data', `${API_BASE}/market-data/bitcoin`));
  
  console.log('\n⛓️  Testing Blockchain...');
  tests.push(await testEndpoint('Balances', `${API_BASE}/blockchain/balances/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`));
  
  console.log('\n😱 Testing Sentiment...');
  tests.push(await testEndpoint('Fear & Greed', `${API_BASE}/sentiment/fear-greed`));
  
  console.log('\n🔍 Testing Patterns...');
  tests.push(await testEndpoint('SMC Analysis', `${API_BASE}/analysis/smc?symbol=bitcoin`));
  
  console.log('\n🤖 Testing AI...');
  tests.push(await testEndpoint('AI Prediction', `${API_BASE}/ai/predict`, 'POST', { symbol: 'BTC' }));
  
  const passed = tests.filter(t => t).length;
  const total = tests.length;
  
  console.log(`\n═══════════════════════════════════════`);
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${total - passed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log(passed >= total * 0.8 ? '\n✅ VERIFICATION COMPLETE\n' : '\n❌ VERIFICATION FAILED\n');
}

runVerification().catch(console.error);
