# Quick Start: Unified Data Source Manager

## 🚀 Get Started in 5 Minutes

### Step 1: Setup Database (30 seconds)

```bash
# Create/update database tables
sqlite3 ./data/trading.db < ./src/database/migrations/create_data_source_tables.sql
```

### Step 2: Add Routes to Server (1 minute)

```typescript
// src/server.ts
import dataSourceRoutes from './routes/dataSourceRoutes.js';

// Add this line with your other routes
app.use('/api/data-sources', dataSourceRoutes);
```

### Step 3: Test the API (1 minute)

```bash
# Test that it's working
curl http://localhost:3000/api/data-sources/test

# Fetch market data
curl "http://localhost:3000/api/data-sources/market?symbol=BTC"

# Check health
curl http://localhost:3000/api/data-sources/health

# Get statistics
curl http://localhost:3000/api/data-sources/stats
```

### Step 4: Use in Your Code (2 minutes)

```typescript
import { unifiedDataSourceManager } from './services/UnifiedDataSourceManager';

// Fetch data with automatic fallback
async function getPrice() {
  const result = await unifiedDataSourceManager.fetchMarketData(
    { symbol: 'BTC' },
    {
      timeout: 5000,           // 5 second timeout
      fallbackEnabled: true,   // Use fallback sources
      cacheEnabled: true       // Use cache if all fail
    }
  );

  if (result.success) {
    console.log('Price:', result.data.price);
    console.log('Source:', result.source);
    console.log('Response time:', result.responseTime, 'ms');
  } else {
    console.error('Error:', result.error);
  }
}
```

### Step 5 (Optional): Add UI Components (1 minute)

```typescript
// Add to your settings or admin page
import { DataSourceManager } from './components/data-sources/DataSourceManager';

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <DataSourceManager />
    </div>
  );
}
```

## 🎯 Common Use Cases

### Switch Between Modes

```typescript
import { unifiedDataSourceManager } from './services/UnifiedDataSourceManager';

// Direct mode (fastest, uses primary sources)
unifiedDataSourceManager.setMode('direct');

// HuggingFace mode (AI-enhanced)
unifiedDataSourceManager.setMode('huggingface');

// Mixed mode (best of both, recommended)
unifiedDataSourceManager.setMode('mixed');
```

### Get Multiple Symbols

```typescript
const symbols = ['BTC', 'ETH', 'ADA'];

const results = await Promise.all(
  symbols.map(symbol => 
    unifiedDataSourceManager.fetchMarketData({ symbol })
  )
);

results.forEach((result, i) => {
  if (result.success) {
    console.log(`${symbols[i]}: $${result.data.price}`);
  }
});
```

### Monitor Health

```typescript
// Get all source health
const health = unifiedDataSourceManager.getSourceHealth();

// Get specific source
const coingeckoHealth = unifiedDataSourceManager.getSourceHealth('coingecko');

// Get statistics
const stats = unifiedDataSourceManager.getStats();
console.log('Success rate:', stats.averageSuccessRate * 100 + '%');
```

### Listen to Notifications

```typescript
unifiedDataSourceManager.on('notification', (notification) => {
  if (notification.type === 'error') {
    console.error('Data source error:', notification.message);
    // Show toast notification to user
  }
});
```

## 📊 Quick API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/data-sources/market?symbol=BTC` | GET | Get market data |
| `/api/data-sources/health` | GET | Health status |
| `/api/data-sources/stats` | GET | Statistics |
| `/api/data-sources/mode` | GET | Current mode |
| `/api/data-sources/mode` | POST | Set mode |
| `/api/data-sources/test` | GET | Test all modes |

## 🎨 UI Components

### Mode Selector
```typescript
import { DataSourceModeSelector } from './components/data-sources/DataSourceModeSelector';

<DataSourceModeSelector />
```

### Notifications
```typescript
import { DataSourceNotifications } from './components/data-sources/DataSourceNotifications';

<DataSourceNotifications 
  maxNotifications={20}
  showTimestamp={true}
  autoHide={false}
/>
```

### Complete Manager
```typescript
import { DataSourceManager } from './components/data-sources/DataSourceManager';

<DataSourceManager />
```

## 🔧 Configuration

Edit `config/providers_config.json` to:
- Add/remove data sources
- Change priorities
- Enable/disable sources
- Adjust timeouts
- Set rate limits

## 📚 Full Documentation

- **Complete Guide**: `docs/DATA_SOURCE_MANAGER_GUIDE.md`
- **Examples**: `examples/data-source-integration-example.ts`
- **Summary**: `IMPLEMENTATION_SUMMARY.md`

## 🐛 Troubleshooting

### Sources failing?
```bash
curl http://localhost:3000/api/data-sources/health
```

### Want to test?
```bash
curl http://localhost:3000/api/data-sources/test
```

### Check logs?
```typescript
const stats = unifiedDataSourceManager.getStats();
console.log(stats);
```

## ✅ That's It!

You now have:
- ✅ Automatic fallback on failures
- ✅ 5-second timeout with auto-switch
- ✅ Database caching
- ✅ Failure tracking
- ✅ Mixed mode support
- ✅ User notifications
- ✅ Complete UI components

**Ready to use in production!** 🎉
