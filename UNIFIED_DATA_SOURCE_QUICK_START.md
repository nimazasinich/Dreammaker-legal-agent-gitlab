# 🚀 Unified Data Source Manager - Quick Start Guide

## Overview
The Unified Data Source Manager provides seamless integration of multiple data sources (HuggingFace, CoinGecko, Binance) with automatic fallback, caching, and comprehensive monitoring.

## ⚡ Quick Setup (5 Minutes)

### 1. Install Dependencies
```bash
# Already installed if you have the project dependencies
npm install
```

### 2. Configure Environment (Optional)
```bash
# Add to .env file (optional - system works without these)
HUGGINGFACE_API_KEY=your_key_here  # Optional: for higher rate limits
PRIMARY_DATA_SOURCE=mixed          # Options: huggingface, direct, mixed
```

### 3. Start the Server
```bash
npm run dev
# Server starts on http://localhost:3000
```

### 4. Access the Monitor UI
Open in your browser:
```
http://localhost:3000/data-sources
```

## 🎯 Basic Usage Examples

### Example 1: Fetch Market Data
```typescript
import { unifiedDataSourceManager } from './services/UnifiedDataSourceManager';

// Simple fetch with automatic fallback
const result = await unifiedDataSourceManager.fetchMarketData(
  { symbol: 'BTCUSDT' },
  { fallbackEnabled: true, cacheEnabled: true }
);

console.log(result.data);      // Market data
console.log(result.source);    // Data source used
console.log(result.fromCache); // Was cached?
```

### Example 2: Get Sentiment Analysis
```typescript
// Analyze sentiment for a cryptocurrency
const sentiment = await unifiedDataSourceManager.fetchSentiment(
  { symbol: 'BTC' },
  { timeout: 15000 }
);

console.log(sentiment.data.sentiment); // 'positive', 'negative', or 'neutral'
console.log(sentiment.data.score);     // Confidence score
```

### Example 3: Generate Price Predictions
```typescript
// Get price predictions for multiple timeframes
const prediction = await unifiedDataSourceManager.fetchPricePrediction(
  { 
    symbol: 'BTCUSDT',
    timeframes: ['1h', '24h', '7d']
  },
  { timeout: 20000 }
);

console.log(prediction.data.predictions);
```

## 📊 Using the REST API

### Fetch Market Data
```bash
curl "http://localhost:3000/api/unified-data/market/BTCUSDT?cacheEnabled=true"
```

### Get Sentiment
```bash
curl -X POST http://localhost:3000/api/unified-data/sentiment \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTC"}'
```

### Get Price Prediction
```bash
curl -X POST http://localhost:3000/api/unified-data/prediction \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTCUSDT", "timeframes": ["1h", "24h"]}'
```

### Check Health Status
```bash
curl http://localhost:3000/api/unified-data/health
```

### Get Performance Metrics
```bash
curl http://localhost:3000/api/unified-data/metrics
```

### Generate System Report
```bash
curl http://localhost:3000/api/unified-data/report
```

## 🔧 Configuration Modes

### Mode 1: HuggingFace Primary (with fallback)
```typescript
unifiedDataSourceManager.setMode('huggingface');
// Tries HuggingFace first, falls back to CoinGecko/Binance on failure
```

### Mode 2: Direct (no HuggingFace)
```typescript
unifiedDataSourceManager.setMode('direct');
// Uses only CoinGecko and Binance
```

### Mode 3: Mixed (parallel sources)
```typescript
unifiedDataSourceManager.setMode('mixed');
// Fetches from all sources in parallel, returns first success
```

## 🧪 Testing

### Run All Tests
```bash
npm run test:unified-data
```

### Run Unit Tests
```bash
npm run unified-data:test
```

### Test Individual Features
```typescript
// In your code or REPL
import { unifiedDataSourceManager } from './services/UnifiedDataSourceManager';

// Test market data fetch
await unifiedDataSourceManager.fetchMarketData({ symbol: 'BTCUSDT' }, {});

// Check health
await unifiedDataSourceManager.checkHealth();

// Generate report
unifiedDataSourceManager.generateReport();
```

## 📈 Monitoring & Observability

### View Dashboard
Navigate to: `http://localhost:3000/data-sources`

Features:
- ✅ Real-time health status for all data sources
- ✅ Performance metrics visualization
- ✅ Cache hit rate tracking
- ✅ Fallback usage monitoring
- ✅ Mode switching controls
- ✅ Cache clearing and metrics reset

### Access Metrics Programmatically
```typescript
// Get metrics
const metrics = unifiedDataSourceManager.getMetrics();
console.log(metrics);

// Generate comprehensive report
const report = unifiedDataSourceManager.generateReport();
console.log(report);

// Check health
const health = await unifiedDataSourceManager.checkHealth();
console.log(health);
```

## 🔍 Troubleshooting

### Problem: "Cannot fetch data"
**Solution:**
- Check internet connectivity
- Verify API keys (if using HuggingFace with key)
- Enable fallback: `fallbackEnabled: true`
- Check health status: `/api/unified-data/health`

### Problem: "Slow response times"
**Solution:**
- Enable caching: `cacheEnabled: true`
- Use mixed mode for parallel requests
- Increase timeout value
- Check network latency

### Problem: "Cache not working"
**Solution:**
- Verify `cacheEnabled: true` in options
- Check cache statistics: `/api/unified-data/config`
- Clear cache if stale: `DELETE /api/unified-data/cache`

## 🎓 Best Practices

1. **Always enable fallback for production**
   ```typescript
   { fallbackEnabled: true }
   ```

2. **Use caching for frequently accessed data**
   ```typescript
   { cacheEnabled: true }
   ```

3. **Set appropriate timeouts**
   - Market data: 5 seconds
   - Sentiment: 15 seconds
   - Predictions: 20 seconds

4. **Monitor performance regularly**
   - Check metrics dashboard
   - Generate reports periodically
   - Set up health check alerts

5. **Handle errors gracefully**
   ```typescript
   const result = await unifiedDataSourceManager.fetchMarketData(...);
   if (!result.success) {
     console.error('Error:', result.error);
     // Use fallback UI or mock data
   }
   ```

## 📚 Key Features

- ✅ **Multi-source support**: HuggingFace, CoinGecko, Binance
- ✅ **Automatic fallback**: No manual intervention needed
- ✅ **Intelligent caching**: Reduces API calls and costs
- ✅ **Three operating modes**: huggingface, direct, mixed
- ✅ **Real-time monitoring**: Dashboard with live metrics
- ✅ **Performance tracking**: Per-source metrics and reports
- ✅ **Health checks**: Automatic monitoring of all sources
- ✅ **Comprehensive logging**: Debug-friendly error messages
- ✅ **TypeScript support**: Full type safety
- ✅ **Production ready**: Battle-tested and optimized

## 🔗 Resources

- **Full Documentation**: `UNIFIED_DATA_SOURCE_INTEGRATION.md`
- **Source Code**: `src/services/UnifiedDataSourceManager.ts`
- **API Routes**: `src/routes/unifiedDataSource.ts`
- **Monitor UI**: `src/components/UnifiedDataSourceMonitor.tsx`
- **Tests**: `src/services/__tests__/UnifiedDataSourceManager.test.ts`

## 💡 Tips

1. Start with `mixed` mode for maximum reliability
2. Enable caching in production to reduce costs
3. Monitor cache hit rate (target: >60%)
4. Review metrics weekly to identify issues
5. Set up alerts for health check failures
6. Use appropriate timeouts based on data type
7. Download reports for analysis
8. Clear cache when switching modes

## 🎉 Success!

You're now ready to use the Unified Data Source Manager!

For more examples and advanced usage, see `UNIFIED_DATA_SOURCE_INTEGRATION.md`

---

**Need Help?**
- Check the full documentation
- Review test cases for examples
- Inspect the monitor UI
- Check system health status
