# Data Retrieval System Documentation

## Overview

This document provides information about the data retrieval system, testing procedures, and deployment commands.

## Quick Start

### Validate Data Source Configuration

```bash
# Validate all configured data sources and API keys
node scripts/validate-data-sources.js
```

### Test Data Retrieval Endpoints

```bash
# Start the server first
npm run start:server

# In another terminal, run the test script
./scripts/test-data-retrieval.sh
```

### Check Provider Health

```bash
# Check health status of all providers
curl http://localhost:8000/api/providers/status

# Check specific provider category
curl http://localhost:8000/api/providers/market
```

## Configuration Files

### Main Configuration Files

1. **config/api.json** - Main API configuration
   - Exchange settings (Binance, KuCoin)
   - API keys and endpoints
   - Cache TTLs
   - Rate limits

2. **config/providers_config.json** - Provider configuration
   - 38+ providers across 7 categories
   - Priority-based fallback order
   - Health check settings

3. **config/exchanges.json** - Exchange-specific settings
   - KuCoin configuration
   - API credentials

## Data Sources

### Primary Sources

- **HuggingFace** - AI/ML models and datasets
- **CoinGecko** - Market data (primary)
- **CoinMarketCap** - Market cap and price data
- **CryptoCompare** - Price and market data

### Exchange APIs

- **Binance** - Currently neutralized (returns dummy data)
- **KuCoin** - Active, supports futures trading

### Additional Providers

See `DATA_RETRIEVAL_ANALYSIS_REPORT.json` for complete list of 38+ providers.

## API Endpoints

### Market Data

- `GET /api/market/prices` - Get current prices for all symbols
- `GET /api/market/real-prices` - Get real-time prices
- `GET /api/price/:symbol` - Get price for specific symbol
- `GET /api/market/historical` - Get historical OHLCV data

### Configuration

- `GET /api/config/data-source` - Get current data source configuration
- `POST /api/config/data-source` - Update data source configuration

### Provider Status

- `GET /api/providers/status` - Get health status of all providers
- `GET /api/providers/categories` - Get all provider categories
- `GET /api/providers/:category` - Get providers for specific category

### Proxy Endpoints

- `GET /api/proxy/binance/*` - Binance API proxy
- `GET /api/proxy/coingecko/*` - CoinGecko API proxy
- `GET /api/proxy/kraken/*` - Kraken API proxy

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Data Retrieval Tests

```bash
# Start server
npm run start:server

# Run tests
./scripts/test-data-retrieval.sh
```

### Validate Configuration

```bash
node scripts/validate-data-sources.js
```

## CI/CD

### GitHub Actions

The repository includes a CI workflow for data retrieval testing:

```yaml
.github/workflows/data-retrieval-test.yml
```

This workflow:
- Validates data source configuration
- Tests data retrieval endpoints
- Runs integration tests (optional)
- Generates test reports

### Manual Trigger

```bash
# Trigger workflow manually via GitHub Actions UI
# Or use GitHub CLI:
gh workflow run data-retrieval-test.yml
```

## Deployment

### Environment Variables

Required:
- `PRIMARY_DATA_SOURCE` - Primary data source (huggingface/binance/kucoin/mixed)
- `HF_ENGINE_ENABLED` - Enable HuggingFace engine
- `HF_ENGINE_BASE_URL` - HuggingFace engine URL

Optional:
- `BINANCE_API_KEY` - Binance API key
- `BINANCE_SECRET_KEY` - Binance secret key
- `KUCOIN_API_KEY` - KuCoin API key
- `KUCOIN_SECRET_KEY` - KuCoin secret key
- `KUCOIN_PASSPHRASE` - KuCoin passphrase

### Pre-deployment Checklist

1. Validate configuration:
   ```bash
   node scripts/validate-data-sources.js
   ```

2. Test endpoints:
   ```bash
   ./scripts/test-data-retrieval.sh
   ```

3. Check provider health:
   ```bash
   curl http://localhost:8000/api/providers/status
   ```

### Docker Deployment

```bash
# Build
docker-compose build

# Start
docker-compose up -d

# Check logs
docker-compose logs -f
```

## Troubleshooting

### Common Issues

1. **Provider not responding**
   - Check API key configuration
   - Verify network connectivity
   - Check rate limits

2. **Cache issues**
   - Clear cache: `POST /api/system/cache/clear`
   - Check cache stats: `GET /api/system/cache/stats`

3. **BinanceService returns dummy data**
   - This is expected - BinanceService is currently neutralized
   - Use other providers for market data

### Debug Commands

```bash
# Check server health
curl http://localhost:8000/api/health

# Check provider status
curl http://localhost:8000/api/providers/status

# Check cache statistics
curl http://localhost:8000/api/system/cache/stats

# View system status
curl http://localhost:8000/api/system/status
```

## Performance Optimization

### Cache Configuration

Cache TTLs are configured in `config/api.json`:
- Market data: 120 seconds
- News: 600 seconds
- Sentiment: 3600 seconds

### Rate Limiting

Rate limits are enforced per provider:
- CoinGecko: 50 req/min
- CoinMarketCap: 300 req/min
- CryptoCompare: 100 req/min
- Binance: 1200 req/min

## Additional Resources

- **Full Analysis Report**: `DATA_RETRIEVAL_ANALYSIS_REPORT.json`
- **API Documentation**: See `docs/` directory
- **Configuration Examples**: See `config/` directory

## Support

For issues or questions:
1. Check the analysis report: `DATA_RETRIEVAL_ANALYSIS_REPORT.json`
2. Review configuration files in `config/`
3. Check server logs for detailed error messages
