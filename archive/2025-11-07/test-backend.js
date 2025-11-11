#!/usr/bin/env node

/**
 * Quick Backend Health Check
 * Tests if all required endpoints are responding
 */

const http = require('http');

const BACKEND_HOST = 'localhost';
const BACKEND_PORT = 8000;

const endpoints = [
  { path: '/health', name: 'Health Check' },
  { path: '/api/status/health', name: 'Status Health' },
  { path: '/api/sentiment/global', name: 'Sentiment Global' },
  { path: '/api/news?limit=5', name: 'News Feed' },
  { path: '/api/market/quotes?symbols=BTC,ETH', name: 'Market Quotes' },
  { path: '/api/signals', name: 'Trading Signals' },
  { path: '/api/portfolio/status', name: 'Portfolio Status' },
  { path: '/api/pnl/portfolio-summary', name: 'P&L Summary' },
];

function testEndpoint(path, name) {
  return new Promise((resolve) => {
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: path,
      method: 'GET',
      timeout: 3000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const status = res.statusCode;
        const success = status >= 200 && status < 300;
        resolve({
          name,
          path,
          status,
          success,
          message: success ? '✅ OK' : `❌ Failed (${status})`,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        name,
        path,
        status: 0,
        success: false,
        message: `❌ Error: ${err.message}`,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        name,
        path,
        status: 0,
        success: false,
        message: '❌ Timeout',
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('\n🔍 Testing Backend Endpoints...\n');
  console.log(`Backend: http://${BACKEND_HOST}:${BACKEND_PORT}\n`);

  const results = await Promise.all(
    endpoints.map(({ path, name }) => testEndpoint(path, name))
  );

  console.log('Results:\n');
  results.forEach((result) => {
    console.log(`${result.message} ${result.name}`);
    console.log(`   ${result.path}`);
    if (result.status > 0) {
      console.log(`   Status: ${result.status}`);
    }
    console.log('');
  });

  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  console.log('─'.repeat(50));
  console.log(`\n✨ Summary: ${successCount}/${totalCount} endpoints working\n`);

  if (successCount === totalCount) {
    console.log('🎉 All endpoints are healthy!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some endpoints failed. Make sure backend is running:\n');
    console.log('   cd backend');
    console.log('   python -m uvicorn simple_main:app --host 0.0.0.0 --port 8000 --reload\n');
    process.exit(1);
  }
}

// Test WebSocket separately
function testWebSocket() {
  console.log('🔌 Testing WebSocket connection...\n');
  
  // Note: WebSocket test requires 'ws' package
  // For now, just show the command to test manually
  console.log('To test WebSocket manually, use:');
  console.log('  wscat -c ws://localhost:8000/ws/hub\n');
  console.log('Or check browser console when frontend is running.\n');
}

// Run tests
runTests().then(() => {
  testWebSocket();
}).catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
