# Developer Quick Reference - Data Source Integration

**Quick Start Guide for Working with the Data Retrieval System**

---

## 🚀 Quick Start

### Adding a New Data Provider

```typescript
// 1. Add configuration to providers_config.json
{
  "name": "new_provider",
  "priority": 10,
  "baseUrl": "https://api.newprovider.com",
  "key": "${NEW_PROVIDER_API_KEY}",
  "category": "market", // or news, sentiment, etc.
  "rateLimitPerMinute": 100,
  "enabled": true
}

// 2. Create client in MultiProviderMarketDataService
private newProviderClient: AxiosInstance;

this.newProviderClient = axios.create({
  baseUrl: getBaseURL('new_provider', 'marketData'),
  timeout: 10000,
  headers: {
    'Authorization': `Bearer ${getAPIKey('new_provider', 'marketData')}`
  }
});

// 3. Add rate limiter
private readonly newProviderLimiter = new TokenBucket(100, 1);

// 4. Implement fetch method
async getPricesFromNewProvider(symbols: string[]): Promise<PriceData[]> {
  await this.newProviderLimiter.acquire();
  
  try {
    const response = await this.newProviderClient.get('/prices', {
      params: { symbols: symbols.join(',') }
    });
    
    return this.normalizeNewProviderResponse(response.data);
  } catch (error) {
    this.logger.error('New Provider fetch failed', {}, error);
    throw error;
  }
}

// 5. Add to fallback chain
async getRealTimePrices(symbols: string[]): Promise<PriceData[]> {
  // ... existing code ...
  
  // Add to fallback cascade
  return await this.tryFallbackProviders(symbols, [
    'coingecko',
    'cryptocompare',
    'new_provider', // ← Add here
    'coincap'
  ]);
}
```

---

## 📡 Making API Requests

### From Frontend Components

```typescript
import { dataManager } from '@/services/dataManager';

// Simple fetch
const prices = await dataManager.fetchData('/market/prices?symbols=BTC,ETH');

// With caching
const data = await cache.getOrSet(
  'btc-price',
  () => dataManager.fetchData('/market/prices?symbols=BTC'),
  { ttl: 10 }
);

// WebSocket subscription
const unsubscribe = dataManager.subscribe(
  'market_data',
  ['BTC', 'ETH'],
  (data) => {
    console.log('Price update:', data);
    updateUI(data);
  }
);

// Cleanup
onUnmount(() => unsubscribe());
```

### From Backend Services

```typescript
import { MultiProviderMarketDataService } from '@/services/MultiProviderMarketDataService';

const marketService = MultiProviderMarketDataService.getInstance();

// Get real-time prices
const prices = await marketService.getRealTimePrices(['BTC', 'ETH', 'SOL']);

// Get OHLCV data
const ohlcv = await marketService.getOHLCV('BTC', '1h', 100);

// Get from specific provider
const geckoPrice = await marketService.getPricesFromCoinGecko(['BTC']);
```

---

## 🔧 Configuration

### Environment Variables

```bash
# .env file
PRIMARY_DATA_SOURCE=huggingface
HF_ENGINE_BASE_URL=/api/hf-engine

# API Keys (NEVER commit these!)
COINMARKETCAP_API_KEY=your_key_here
CRYPTOCOMPARE_API_KEY=your_key_here
ETHERSCAN_API_KEY=your_key_here
```

### Runtime Configuration

```typescript
// Change primary data source
import { setPrimarySource } from '@/config/dataSource';
setPrimarySource('mixed'); // or 'huggingface', 'binance', 'kucoin'

// Get current configuration
import { getDataSourceConfig } from '@/config/dataSource';
const config = getDataSourceConfig();
console.log('Primary source:', config.primarySource);
```

---

## 🎯 Common Patterns

### Pattern 1: Try Primary, Fallback to Secondary

```typescript
async fetchPriceWithFallback(symbol: string): Promise<number> {
  try {
    // Try primary provider
    const result = await this.coingeckoClient.get(`/simple/price?ids=${symbol}`);
    return result.data[symbol].usd;
  } catch (error) {
    this.logger.warn('Primary provider failed, trying fallback');
    
    // Fallback to secondary
    try {
      const result = await this.cryptoCompareClient.get(`/price?fsym=${symbol}&tsyms=USD`);
      return result.data.USD;
    } catch (fallbackError) {
      this.logger.error('All providers failed');
      throw new Error('Unable to fetch price');
    }
  }
}
```

### Pattern 2: Parallel Fetch with Race

```typescript
async fetchFastest(symbol: string): Promise<PriceData> {
  const providers = [
    this.fetchFromCoinGecko(symbol),
    this.fetchFromCryptoCompare(symbol),
    this.fetchFromCoinCap(symbol)
  ];
  
  // Return first successful response
  return Promise.any(providers);
}
```

### Pattern 3: Aggregate Multiple Sources

```typescript
async fetchAggregatedPrice(symbol: string): Promise<number> {
  const results = await Promise.allSettled([
    this.fetchFromCoinGecko(symbol),
    this.fetchFromCryptoCompare(symbol),
    this.fetchFromCoinCap(symbol)
  ]);
  
  const prices = results
    .filter(r => r.status === 'fulfilled')
    .map(r => (r as PromiseFulfilledResult<PriceData>).value.price);
  
  if (prices.length === 0) {
    throw new Error('No providers returned data');
  }
  
  // Return weighted average
  return prices.reduce((sum, p) => sum + p, 0) / prices.length;
}
```

### Pattern 4: Cache with Stale-While-Revalidate

```typescript
async getCachedPrice(symbol: string): Promise<PriceData> {
  const cacheKey = `price:${symbol}`;
  const cached = this.cache.get(cacheKey);
  
  // Return cached if fresh
  if (cached && !cached.isStale()) {
    return cached.data;
  }
  
  // Return stale data immediately, refresh in background
  if (cached && cached.isStale()) {
    this.refreshInBackground(symbol);
    return cached.data;
  }
  
  // No cache, fetch fresh
  const fresh = await this.fetchFresh(symbol);
  this.cache.set(cacheKey, fresh, 60); // 60s TTL
  return fresh;
}

private async refreshInBackground(symbol: string) {
  try {
    const fresh = await this.fetchFresh(symbol);
    this.cache.set(`price:${symbol}`, fresh, 60);
  } catch (error) {
    // Silent fail, keep stale data
  }
}
```

---

## 🛡️ Error Handling

### Handling Provider Failures

```typescript
try {
  const data = await provider.fetch();
} catch (error: any) {
  // Classify error
  if (error.response?.status === 429) {
    // Rate limited - wait and retry
    this.logger.warn('Rate limited, backing off');
    await this.backoff(5000);
    return this.fetchWithBackup();
  }
  
  if (error.response?.status === 401) {
    // Authentication error - key invalid
    this.logger.error('API key invalid');
    this.disableProvider('provider_name');
    return this.fetchFromFallback();
  }
  
  if (error.response?.status === 451) {
    // Geo-blocked - try proxy
    this.logger.warn('Geo-blocked, trying proxy');
    return this.fetchViaProxy();
  }
  
  if (error.code === 'ETIMEDOUT') {
    // Timeout - try faster provider
    this.logger.warn('Request timeout');
    return this.fetchFromFasterProvider();
  }
  
  // Unknown error - fail gracefully
  this.logger.error('Unknown error', {}, error);
  return this.getFromCache() || this.getMockData();
}
```

### Circuit Breaker Usage

```typescript
import { CircuitBreaker } from '@/utils/circuitBreaker';

const breaker = new CircuitBreaker({
  maxFailures: 3,
  cooldownMs: 60000,
  halfOpenAfterMs: 30000
});

async function protectedFetch() {
  return breaker.execute(async () => {
    return await apiClient.get('/data');
  });
}
```

---

## ⚡ Rate Limiting

### Using Token Bucket

```typescript
import { TokenBucket } from '@/utils/rateLimiter';

// Create limiter: 50 requests per minute
const limiter = new TokenBucket(50, 1);

async function makeRequest() {
  // Acquire token (waits if none available)
  await limiter.acquire();
  
  // Make request
  return await fetch('https://api.example.com/data');
}
```

### Rate Limiter with Overflow

```typescript
class SmartRateLimiter {
  private primary: TokenBucket;
  private fallback: TokenBucket;
  
  async acquire(priority: 'high' | 'normal'): Promise<void> {
    if (await this.primary.tryAcquire()) {
      return;
    }
    
    // Primary exhausted, try fallback
    if (priority === 'high' && await this.fallback.tryAcquire()) {
      return;
    }
    
    // Both exhausted, wait for primary
    return this.primary.acquire();
  }
}
```

---

## 💾 Caching Strategies

### TTL Cache

```typescript
import { TTLCache } from '@/utils/cache';

// Create cache with 60 second TTL
const cache = new TTLCache<PriceData>(60000);

// Set value
cache.set('BTC', { price: 43250, timestamp: Date.now() });

// Get value (returns undefined if expired)
const btcPrice = cache.get('BTC');

// Clear cache
cache.clear();
```

### Advanced Cache with Tags

```typescript
import { AdvancedCache } from '@/core/AdvancedCache';

const cache = AdvancedCache.getInstance();

// Cache with tags
await cache.set('btc-price', priceData, {
  ttl: 60,
  tags: ['market-data', 'btc']
});

// Invalidate by tag
await cache.invalidateByTag('market-data');

// Get or set pattern
const data = await cache.getOrSet(
  'eth-ohlcv',
  async () => await fetchOHLCV('ETH'),
  { ttl: 120, tags: ['ohlcv', 'eth'] }
);
```

---

## 🔍 Debugging

### Enable Debug Logging

```typescript
// In .env
LOG_LEVEL=debug

// In code
import { Logger } from '@/core/Logger';
const logger = Logger.getInstance();

logger.debug('Fetching from provider', { provider: 'coingecko', symbols: ['BTC'] });
logger.info('Cache hit', { key: 'btc-price', ttl: 45 });
logger.warn('Provider degraded', { provider: 'cmc', status: 429 });
logger.error('Request failed', {}, error);
```

### Monitor Provider Health

```typescript
import { MultiProviderMarketDataService } from '@/services/MultiProviderMarketDataService';

const service = MultiProviderMarketDataService.getInstance();

// Get provider metrics
const health = await service.getProviderHealth('coingecko');
console.log({
  successRate: health.successRate,
  avgLatency: health.avgResponseTime,
  status: health.status
});
```

### Trace Requests

```typescript
// Add correlation ID to requests
const correlationId = generateId();

const response = await fetch(url, {
  headers: {
    'X-Correlation-ID': correlationId
  }
});

logger.info('Request completed', {
  correlationId,
  duration: Date.now() - startTime
});
```

---

## 📊 Testing

### Mock Data Provider

```typescript
// In tests
import { jest } from '@jest/globals';

const mockProvider = {
  getPrices: jest.fn().mockResolvedValue([
    { symbol: 'BTC', price: 43250, timestamp: Date.now() }
  ])
};

// Replace real provider
jest.mock('@/services/MultiProviderMarketDataService', () => ({
  getInstance: () => mockProvider
}));
```

### Test Fallback Chain

```typescript
describe('Fallback mechanism', () => {
  it('should fallback to secondary when primary fails', async () => {
    // Mock primary to fail
    mockCoinGecko.getPrices.mockRejectedValue(new Error('Timeout'));
    
    // Mock secondary to succeed
    mockCryptoCompare.getPrices.mockResolvedValue([{ price: 43250 }]);
    
    const result = await service.getRealTimePrices(['BTC']);
    
    expect(result).toBeDefined();
    expect(result[0].source).toBe('cryptocompare');
  });
});
```

---

## 🎨 Best Practices

### DO ✅

1. **Always use caching for repeated requests**
   ```typescript
   const data = await cache.getOrSet(key, fetcher, { ttl: 60 });
   ```

2. **Implement proper error handling**
   ```typescript
   try {
     return await primaryProvider.fetch();
   } catch (error) {
     return await fallbackProvider.fetch();
   }
   ```

3. **Respect rate limits**
   ```typescript
   await rateLimiter.acquire();
   const data = await provider.fetch();
   ```

4. **Use environment variables for API keys**
   ```bash
   PROVIDER_API_KEY=your_key_here
   ```

5. **Add timeouts to all requests**
   ```typescript
   const response = await fetch(url, { timeout: 10000 });
   ```

6. **Log provider usage for monitoring**
   ```typescript
   logger.info('Provider used', { provider: 'coingecko', latency: 250 });
   ```

### DON'T ❌

1. **Don't hardcode API keys**
   ```typescript
   // ❌ BAD
   const API_KEY = 'abc123';
   
   // ✅ GOOD
   const API_KEY = process.env.API_KEY;
   ```

2. **Don't make requests without rate limiting**
   ```typescript
   // ❌ BAD
   for (let i = 0; i < 1000; i++) {
     await fetch(url);
   }
   
   // ✅ GOOD
   for (let i = 0; i < 1000; i++) {
     await rateLimiter.acquire();
     await fetch(url);
   }
   ```

3. **Don't ignore cache**
   ```typescript
   // ❌ BAD - Always fetches fresh
   const data = await fetch(url);
   
   // ✅ GOOD - Uses cache when available
   const data = await cache.getOrSet(key, () => fetch(url));
   ```

4. **Don't throw errors without fallback**
   ```typescript
   // ❌ BAD
   if (error) throw error;
   
   // ✅ GOOD
   if (error) {
     return await fallbackProvider.fetch();
   }
   ```

5. **Don't make synchronous blocking calls**
   ```typescript
   // ❌ BAD
   const data1 = await fetch(url1);
   const data2 = await fetch(url2);
   
   // ✅ GOOD
   const [data1, data2] = await Promise.all([
     fetch(url1),
     fetch(url2)
   ]);
   ```

---

## 🔗 Useful Links

### Internal Documentation
- `/src/services/MultiProviderMarketDataService.ts` - Main service
- `/src/config/CentralizedAPIConfig.ts` - Provider configuration
- `/src/utils/rateLimiter.ts` - Rate limiting utilities
- `/src/utils/cache.ts` - Caching utilities

### API Documentation
- [CoinGecko API](https://www.coingecko.com/en/api/documentation)
- [CoinMarketCap API](https://coinmarketcap.com/api/documentation/v1/)
- [CryptoCompare API](https://min-api.cryptocompare.com/documentation)
- [Binance API](https://binance-docs.github.io/apidocs/)
- [HuggingFace Inference API](https://huggingface.co/docs/api-inference/index)

---

## 🆘 Common Issues & Solutions

### Issue: "Rate limit exceeded"
**Solution:** 
```typescript
// Increase cache TTL to reduce API calls
const cache = new TTLCache(120000); // 2 minutes instead of 1

// Or add more aggressive caching
if (cached && isWithinAcceptableAge(cached)) {
  return cached;
}
```

### Issue: "API key invalid"
**Solution:**
```bash
# Check environment variable
echo $COINMARKETCAP_API_KEY

# Verify in config
console.log(getAPIKey('coinmarketcap'));

# Test key directly
curl -H "X-CMC_PRO_API_KEY: your_key" https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest
```

### Issue: "Geo-blocked (451 error)"
**Solution:**
```typescript
// Use CORS proxy
const proxiedUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(apiUrl)}`;
const response = await fetch(proxiedUrl);
```

### Issue: "Timeout errors"
**Solution:**
```typescript
// Increase timeout
axios.create({ timeout: 15000 }); // 15 seconds

// Or implement retry with backoff
const result = await retry(() => fetch(url), {
  retries: 3,
  delay: 1000,
  backoff: 2
});
```

### Issue: "Inconsistent data between providers"
**Solution:**
```typescript
// Use weighted average
const prices = await Promise.all([
  provider1.getPrice(),
  provider2.getPrice(),
  provider3.getPrice()
]);

const weightedAvg = (
  prices[0] * 0.5 +  // 50% weight to primary
  prices[1] * 0.3 +  // 30% to secondary
  prices[2] * 0.2    // 20% to tertiary
);
```

---

## 📞 Support

For questions or issues:
1. Check the main analysis report: `DATA_RETRIEVAL_ANALYSIS_REPORT.md`
2. Review data flow diagrams: `DATA_FLOW_DIAGRAM.md`
3. Consult source code comments in `/src/services/`
4. Check configuration files in `/config/`

---

**Last Updated:** November 26, 2025  
**Maintainer:** Development Team  
**Version:** 1.0
