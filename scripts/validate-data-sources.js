#!/usr/bin/env node
/**
 * Validate Data Sources Configuration
 * 
 * This script validates all configured data sources and API keys,
 * providing a comprehensive report on the status of each provider.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Load configuration files
function loadConfig(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    }
  } catch (error) {
    log(`Error loading ${filePath}: ${error.message}`, 'red');
  }
  return null;
}

// Validate API key format
function validateApiKey(key, provider) {
  if (!key || key.trim() === '') {
    return { valid: false, reason: 'Missing or empty' };
  }
  
  // Basic format validation based on provider
  const validations = {
    coinmarketcap: /^[a-f0-9-]{36}$/i,
    cryptocompare: /^[a-f0-9]{32}$/i,
    etherscan: /^[A-Z0-9]{34}$/,
    bscscan: /^[A-Z0-9]{34}$/,
    newsapi: /^[a-zA-Z0-9_]+$/,
    tronscan: /^[a-f0-9-]{36}$/i
  };
  
  if (validations[provider]) {
    if (validations[provider].test(key)) {
      return { valid: true };
    } else {
      return { valid: false, reason: 'Invalid format' };
    }
  }
  
  // Default: non-empty is valid
  return { valid: key.length > 0, reason: key.length === 0 ? 'Empty' : 'Unknown format' };
}

// Test provider endpoint
async function testProvider(provider, config) {
  const results = {
    name: provider.name,
    enabled: provider.enabled,
    hasKey: !!(provider.key && provider.key.trim()),
    keyValid: false,
    endpointReachable: false,
    responseTime: null,
    error: null
  };
  
  if (!provider.enabled) {
    return results;
  }
  
  // Validate API key if present
  if (provider.key) {
    const keyValidation = validateApiKey(provider.key, provider.name);
    results.keyValid = keyValidation.valid;
    if (!keyValidation.valid) {
      results.error = keyValidation.reason;
    }
  }
  
  // Test endpoint reachability (basic connectivity test)
  if (provider.baseUrl) {
    try {
      const startTime = Date.now();
      const response = await axios.get(provider.baseUrl, {
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      results.endpointReachable = true;
      results.responseTime = Date.now() - startTime;
    } catch (error) {
      results.endpointReachable = false;
      results.error = error.message;
    }
  }
  
  return results;
}

// Main validation function
async function validateDataSources() {
  log('\n🔍 Validating Data Sources Configuration\n', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const apiConfig = loadConfig('config/api.json');
  const providersConfig = loadConfig('config/providers_config.json');
  const exchangesConfig = loadConfig('config/exchanges.json');
  
  const results = {
    total: 0,
    enabled: 0,
    configured: 0,
    issues: []
  };
  
  // Validate API configuration
  if (apiConfig) {
    log('\n📋 API Configuration (config/api.json)', 'blue');
    log('-'.repeat(60), 'blue');
    
    if (apiConfig.apis) {
      for (const [name, config] of Object.entries(apiConfig.apis)) {
        results.total++;
        const enabled = config.enabled !== false;
        const hasKey = !!(config.key && config.key.trim());
        
        if (enabled) {
          results.enabled++;
        }
        
        if (hasKey) {
          results.configured++;
        }
        
        const status = enabled 
          ? (hasKey ? '✓' : '⚠') 
          : '○';
        const color = enabled 
          ? (hasKey ? 'green' : 'yellow') 
          : 'reset';
        
        log(`${status} ${name.padEnd(20)} | Enabled: ${enabled} | Key: ${hasKey ? 'Set' : 'Missing'}`, color);
        
        if (enabled && !hasKey && name !== 'coingecko' && name !== 'alternative') {
          results.issues.push({
            provider: name,
            issue: 'Enabled but missing API key',
            severity: 'warning'
          });
        }
      }
    }
  }
  
  // Validate providers configuration
  if (providersConfig && providersConfig.categories) {
    log('\n📊 Provider Categories (config/providers_config.json)', 'blue');
    log('-'.repeat(60), 'blue');
    
    for (const [category, categoryData] of Object.entries(providersConfig.categories)) {
      if (categoryData.providers && Array.isArray(categoryData.providers)) {
        log(`\n${category.toUpperCase()} Providers:`, 'cyan');
        
        for (const provider of categoryData.providers) {
          results.total++;
          const enabled = provider.enabled !== false;
          const hasKey = !!(provider.key && provider.key.trim());
          
          if (enabled) {
            results.enabled++;
          }
          
          if (hasKey) {
            results.configured++;
          }
          
          const testResult = await testProvider(provider, categoryData);
          
          let status = '○';
          let color = 'reset';
          
          if (enabled) {
            if (hasKey && testResult.endpointReachable) {
              status = '✓';
              color = 'green';
            } else if (hasKey) {
              status = '⚠';
              color = 'yellow';
            } else {
              status = '⚠';
              color = 'yellow';
            }
          }
          
          log(`${status} ${provider.name.padEnd(25)} | Enabled: ${enabled} | Key: ${hasKey ? 'Set' : 'Missing'} | Reachable: ${testResult.endpointReachable ? 'Yes' : 'No'}`, color);
          
          if (enabled && !hasKey && !['coingecko', 'alternative', 'reddit'].includes(provider.name)) {
            results.issues.push({
              provider: provider.name,
              category: category,
              issue: 'Enabled but missing API key',
              severity: 'warning'
            });
          }
          
          if (enabled && hasKey && !testResult.endpointReachable) {
            results.issues.push({
              provider: provider.name,
              category: category,
              issue: `Endpoint not reachable: ${testResult.error || 'Unknown error'}`,
              severity: 'error'
            });
          }
        }
      }
    }
  }
  
  // Validate exchange configuration
  if (exchangesConfig && Array.isArray(exchangesConfig)) {
    log('\n💱 Exchange Configuration (config/exchanges.json)', 'blue');
    log('-'.repeat(60), 'blue');
    
    for (const exchange of exchangesConfig) {
      const hasApiKey = !!(exchange.apiKey && exchange.apiKey.trim());
      const hasSecret = !!(exchange.secret && exchange.secret.trim());
      const hasPassphrase = !!(exchange.passphrase && exchange.passphrase.trim());
      
      const status = (hasApiKey && hasSecret) ? '✓' : '⚠';
      const color = (hasApiKey && hasSecret) ? 'green' : 'yellow';
      
      log(`${status} ${exchange.exchange.toUpperCase().padEnd(10)} | API Key: ${hasApiKey ? 'Set' : 'Missing'} | Secret: ${hasSecret ? 'Set' : 'Missing'} | Passphrase: ${hasPassphrase ? 'Set' : 'Missing'}`, color);
      
      if (!hasApiKey || !hasSecret) {
        results.issues.push({
          provider: exchange.exchange,
          issue: 'Missing API credentials',
          severity: 'warning'
        });
      }
    }
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 Validation Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Total Providers: ${results.total}`, 'blue');
  log(`Enabled: ${results.enabled}`, results.enabled > 0 ? 'green' : 'yellow');
  log(`Configured (with keys): ${results.configured}`, results.configured > 0 ? 'green' : 'yellow');
  log(`Issues Found: ${results.issues.length}`, results.issues.length === 0 ? 'green' : 'yellow');
  
  if (results.issues.length > 0) {
    log('\n⚠️  Issues Detected:', 'yellow');
    results.issues.forEach((issue, index) => {
      const color = issue.severity === 'error' ? 'red' : 'yellow';
      log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.provider} (${issue.category || 'N/A'}): ${issue.issue}`, color);
    });
  }
  
  log('\n' + '='.repeat(60), 'cyan');
  
  // Exit code based on issues
  const errorCount = results.issues.filter(i => i.severity === 'error').length;
  if (errorCount > 0) {
    log('❌ Validation completed with errors', 'red');
    process.exit(1);
  } else if (results.issues.length > 0) {
    log('⚠️  Validation completed with warnings', 'yellow');
    process.exit(0);
  } else {
    log('✅ All validations passed!', 'green');
    process.exit(0);
  }
}

// Run validation
validateDataSources().catch(error => {
  log(`\n❌ Fatal error during validation: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
