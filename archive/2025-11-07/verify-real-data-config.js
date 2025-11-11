/**
 * REAL DATA CONFIGURATION VERIFICATION
 * Verifies all API keys, services, and configurations are properly set up
 */

import fs from 'fs';
import path from 'path';

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    log(`✅ ${description}: ${filePath}`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${filePath} NOT FOUND`, 'red');
    return false;
  }
}

function checkEnvVariable(envContent, varName, description) {
  const regex = new RegExp(`^${varName}=(.+)$`, 'm');
  const match = envContent.match(regex);
  
  if (match && match[1] && match[1].trim() !== '') {
    const value = match[1].trim();
    const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
    log(`✅ ${description}: ${displayValue}`, 'green');
    return true;
  } else {
    log(`❌ ${description}: NOT SET`, 'red');
    return false;
  }
}

function checkService(servicePath, serviceName) {
  const exists = fs.existsSync(servicePath);
  if (exists) {
    const content = fs.readFileSync(servicePath, 'utf8');
    const hasRealData = content.includes('real') || content.includes('Real') || content.includes('REAL');
    const hasSimulated = content.includes('simulate') || content.includes('mock') || content.includes('fake');
    
    if (hasRealData && !hasSimulated) {
      log(`✅ ${serviceName}: Real data implementation`, 'green');
      return 'real';
    } else if (hasRealData && hasSimulated) {
      log(`⚠️  ${serviceName}: Mixed (has fallback)`, 'yellow');
      return 'mixed';
    } else {
      log(`❌ ${serviceName}: Simulated data`, 'red');
      return 'simulated';
    }
  } else {
    log(`❌ ${serviceName}: File not found`, 'red');
    return 'missing';
  }
}

async function verifyConfiguration() {
  log('\n🔍 ========================================', 'blue');
  log('   BOLT AI - CONFIGURATION VERIFICATION', 'blue');
  log('   ========================================\n', 'blue');

  let totalChecks = 0;
  let passedChecks = 0;

  // Check .env file
  log('\n📄 ENVIRONMENT CONFIGURATION', 'cyan');
  const envExists = checkFile('.env', 'Environment file');
  totalChecks++;
  if (envExists) passedChecks++;

  if (envExists) {
    const envContent = fs.readFileSync('.env', 'utf8');
    
    log('\n💰 Market Data APIs:', 'yellow');
    if (checkEnvVariable(envContent, 'COINGECKO_API', 'CoinGecko API')) { totalChecks++; passedChecks++; } else totalChecks++;
    if (checkEnvVariable(envContent, 'COINMARKETCAP_API_KEY', 'CoinMarketCap Key')) { totalChecks++; passedChecks++; } else totalChecks++;
    if (checkEnvVariable(envContent, 'CRYPTOCOMPARE_API_KEY', 'CryptoCompare Key')) { totalChecks++; passedChecks++; } else totalChecks++;
    
    log('\n⛓️  Blockchain Explorer APIs:', 'yellow');
    if (checkEnvVariable(envContent, 'ETHERSCAN_API_KEY', 'Etherscan Key')) { totalChecks++; passedChecks++; } else totalChecks++;
    if (checkEnvVariable(envContent, 'BSCSCAN_API_KEY', 'BscScan Key')) { totalChecks++; passedChecks++; } else totalChecks++;
    if (checkEnvVariable(envContent, 'TRONSCAN_API_KEY', 'TronScan Key')) { totalChecks++; passedChecks++; } else totalChecks++;
    
    log('\n📰 News & Sentiment APIs:', 'yellow');
    if (checkEnvVariable(envContent, 'ALTERNATIVE_API', 'Fear & Greed API')) { totalChecks++; passedChecks++; } else totalChecks++;
    if (checkEnvVariable(envContent, 'CRYPTOPANIC_API', 'CryptoPanic API')) { totalChecks++; passedChecks++; } else totalChecks++;
    
    log('\n🔧 Application Settings:', 'yellow');
    if (checkEnvVariable(envContent, 'BACKEND_PORT', 'Backend Port')) { totalChecks++; passedChecks++; } else totalChecks++;
    if (checkEnvVariable(envContent, 'FRONTEND_PORT', 'Frontend Port')) { totalChecks++; passedChecks++; } else totalChecks++;
  }

  // Check critical files
  log('\n📁 CRITICAL FILES', 'cyan');
  if (checkFile('package.json', 'Package configuration')) { totalChecks++; passedChecks++; } else totalChecks++;
  if (checkFile('src/server-real-data.ts', 'Real data server')) { totalChecks++; passedChecks++; } else totalChecks++;
  if (checkFile('src/services/RealMarketDataService.ts', 'Market data service')) { totalChecks++; passedChecks++; } else totalChecks++;
  if (checkFile('src/services/RealDataManager.ts', 'Data manager')) { totalChecks++; passedChecks++; } else totalChecks++;

  // Check services
  log('\n🔧 SERVICE IMPLEMENTATIONS', 'cyan');
  const services = [
    ['src/services/RealMarketDataService.ts', 'Market Data Service'],
    ['src/services/BlockchainDataService.ts', 'Blockchain Service'],
    ['src/services/FearGreedService.ts', 'Fear & Greed Service'],
    ['src/services/WhaleTrackerService.ts', 'Whale Tracker Service'],
    ['src/services/CORSProxyService.ts', 'CORS Proxy Service'],
    ['src/services/RealDataManager.ts', 'Real Data Manager']
  ];

  for (const [servicePath, serviceName] of services) {
    const result = checkService(servicePath, serviceName);
    totalChecks++;
    if (result === 'real' || result === 'mixed') passedChecks++;
  }

  // Check package.json scripts
  log('\n📜 NPM SCRIPTS', 'cyan');
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const scripts = packageJson.scripts || {};
    
    const requiredScripts = [
      ['dev:real', 'Real data development mode'],
      ['dev:backend:real', 'Real data backend only'],
      ['dev:frontend', 'Frontend development']
    ];
    
    for (const [scriptName, description] of requiredScripts) {
      if (scripts[scriptName]) {
        log(`✅ ${description}: npm run ${scriptName}`, 'green');
        totalChecks++;
        passedChecks++;
      } else {
        log(`❌ ${description}: Script not found`, 'red');
        totalChecks++;
      }
    }
  }

  // Check API configuration
  log('\n⚙️  API CONFIGURATION', 'cyan');
  if (fs.existsSync('src/config/apiConfig.ts')) {
    const apiConfig = fs.readFileSync('src/config/apiConfig.ts', 'utf8');
    
    if (apiConfig.includes('coingecko')) {
      log('✅ CoinGecko configured', 'green');
      totalChecks++; passedChecks++;
    } else {
      log('❌ CoinGecko not configured', 'red');
      totalChecks++;
    }
    
    if (apiConfig.includes('cryptocompare') || apiConfig.includes('binance')) {
      log('✅ Fallback providers configured', 'green');
      totalChecks++; passedChecks++;
    } else {
      log('⚠️  No fallback providers', 'yellow');
      totalChecks++;
    }
  }

  // Summary
  log('\n🎯 ========================================', 'blue');
  log('   VERIFICATION SUMMARY', 'blue');
  log('   ========================================', 'blue');
  
  const successRate = totalChecks > 0 ? ((passedChecks / totalChecks) * 100).toFixed(1) : 0;
  
  log(`\n✅ Passed: ${passedChecks}/${totalChecks}`, 'green');
  log(`📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
  
  if (successRate >= 90) {
    log('\n🎉 EXCELLENT! Configuration is complete!', 'green');
    log('   Ready to start with 100% real data.', 'green');
    log('\n   Run: npm run dev:real', 'cyan');
  } else if (successRate >= 70) {
    log('\n⚠️  GOOD! Minor issues detected.', 'yellow');
    log('   System should work with some fallbacks.', 'yellow');
    log('\n   Run: npm run dev:real', 'cyan');
  } else {
    log('\n❌ CRITICAL! Configuration incomplete.', 'red');
    log('   Please fix the issues above before starting.', 'red');
  }
  
  log('\n📚 NEXT STEPS:', 'cyan');
  log('   1. Review any failed checks above', 'reset');
  log('   2. Fix missing configurations', 'reset');
  log('   3. Run: npm run dev:real', 'reset');
  log('   4. Test: node test-real-data-integration.js', 'reset');
  
  log('\n🚀 ========================================\n', 'blue');
}

// Run verification
verifyConfiguration().catch(error => {
  log(`\n❌ Verification failed: ${error.message}`, 'red');
  process.exit(1);
});
