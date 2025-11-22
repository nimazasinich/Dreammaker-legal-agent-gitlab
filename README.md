# DreammakerCryptoSignalAndTrader

Advanced cryptocurrency signal analysis and trading platform with AI-powered insights, real-time market data, and automated trading capabilities.

## Features

- **Multi-Strategy Signal Analysis**: Smart Money Concepts (SMC), Elliott Wave, Harmonic Patterns, and adaptive scoring
- **Real-Time Market Data**: Integration with multiple providers (Binance, CoinGecko, CoinMarketCap, CryptoCompare)
- **AI-Powered Sentiment Analysis**: Hugging Face CryptoBERT models for news and social media sentiment
- **Futures Trading**: KuCoin Futures support with risk management and position tracking
- **Live WebSocket**: Real-time price updates and trading signals
- **Advanced Charting**: Interactive charts with technical indicators and pattern visualization
- **Risk Management**: ATR-based stop-loss, liquidation alerts, and position sizing
- **Backtesting Engine**: Test strategies against historical data
- **Telegram Notifications**: Real-time alerts for high-priority signals
- **Redis Caching**: Optional performance optimization with Redis
- **TypeScript**: Fully typed codebase for reliability and maintainability

## Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type safety and developer experience
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library

### Backend
- **Node.js** (>=18.0.0) - Runtime environment
- **Express** - Web server framework
- **WebSocket (ws)** - Real-time bidirectional communication
- **Better-SQLite3** - Local database for configuration and cache
- **IORedis** - Optional Redis client for distributed caching

### DevOps
- **Docker** - Containerization
- **Nginx** - Reverse proxy and static file serving
- **Railway** - Deployment platform support
- **Vitest** - Unit and integration testing

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0
- (Optional) Redis for caching
- (Optional) Docker for containerized deployment

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader.git
cd DreammakerCryptoSignalAndTrader

# Install dependencies (use --ignore-scripts if you encounter post-install issues)
npm install
# or
npm install --ignore-scripts && npm rebuild better-sqlite3
```

### 2. Environment Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` and configure your API keys and settings (see [Environment Variables](#environment-variables) below).

### 3. Development

Start both frontend and backend in development mode:

```bash
# Using the convenience script
./start.sh

# Or using npm directly
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8001
- **WebSocket**: ws://localhost:8001

### 4. Production Build

```bash
# Build both frontend and backend
npm run build

# Start production server
npm start
```

## Environment Variables

All environment variables are documented in `.env.example`. Key configurations:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Backend server port | `8001` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `DISABLE_REDIS` | Disable Redis caching | `false` | No |
| `FEATURE_FUTURES` | Enable futures trading | `false` | No |
| `EXCHANGE_KUCOIN` | Enable KuCoin integration | `true` | No |

### Data Sources & HuggingFace Engine

The platform supports multiple data sources for market data and analysis. As of Phase 2, **HuggingFace Data Engine** is the recommended primary data source.

#### Primary Data Source Configuration

Configure which data source provides market and status data:

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `PRIMARY_DATA_SOURCE` | Primary data source | `huggingface` | `huggingface`, `binance`, `kucoin`, `mixed` |
| `HF_ENGINE_BASE_URL` | HuggingFace Data Engine URL | `https://really-amin-datasourceforcryptocurrency.hf.space` | Any valid URL |
| `HF_ENGINE_ENABLED` | Enable/disable HF engine | `true` | `true`, `false` |
| `HF_ENGINE_TIMEOUT` | Request timeout in milliseconds | `30000` | Any positive integer |
| `BINANCE_ENABLED` | Enable Binance API | `true` | `true`, `false` |
| `KUCOIN_ENABLED` | Enable KuCoin API | `true` | `true`, `false` |

#### Data Source Options

1. **HuggingFace (Recommended)**
   - **Description**: Multi-provider aggregation engine hosted on HuggingFace Spaces
   - **Benefits**:
     - Aggregates data from multiple sources (CoinGecko, CoinMarketCap, etc.)
     - Built-in rate limiting and caching
     - Sentiment analysis capabilities
     - Provider health monitoring
   - **Configuration**:
     ```env
     PRIMARY_DATA_SOURCE=huggingface
     HF_ENGINE_BASE_URL=https://really-amin-datasourceforcryptocurrency.hf.space
     HF_ENGINE_ENABLED=true
     HF_ENGINE_TIMEOUT=30000
     ```

2. **Binance (Legacy)**
   - **Description**: Direct integration with Binance API
   - **Configuration**:
     ```env
     PRIMARY_DATA_SOURCE=binance
     BINANCE_ENABLED=true
     ```
   - **Note**: Only partially implemented in Phase 2. May return NOT_IMPLEMENTED errors.

3. **KuCoin (Legacy)**
   - **Description**: Direct integration with KuCoin API
   - **Configuration**:
     ```env
     PRIMARY_DATA_SOURCE=kucoin
     KUCOIN_ENABLED=true
     ```
   - **Note**: Only partially implemented in Phase 2. May return NOT_IMPLEMENTED errors.

4. **Mixed (Beta)**
   - **Description**: HuggingFace with exchange fallback
   - **Configuration**:
     ```env
     PRIMARY_DATA_SOURCE=mixed
     HF_ENGINE_ENABLED=true
     BINANCE_ENABLED=true
     ```
   - **Note**: Tries HuggingFace first, falls back to exchanges on failure.

#### Changing Data Source at Runtime

You can change the primary data source through:

1. **Frontend Settings UI**:
   - Navigate to Settings → Data Source Configuration
   - Select your preferred data source
   - Changes take effect immediately

2. **API Endpoint**:
   ```bash
   # Get current configuration
   curl http://localhost:8001/api/config/data-source

   # Update data source
   curl -X POST http://localhost:8001/api/config/data-source \
     -H "Content-Type: application/json" \
     -d '{"primarySource": "huggingface"}'
   ```

#### HuggingFace Data Engine

The HuggingFace Data Engine is a separate service that provides:

- **Multi-provider market data**: Aggregates from CoinGecko, CoinMarketCap, CryptoCompare
- **Rate limit management**: Handles API limits across all providers
- **Health monitoring**: Tracks provider availability and status
- **Sentiment analysis**: CryptoBERT-based sentiment analysis for news and social media
- **Logging and alerts**: Centralized logging and alert system

**Space URL**: https://huggingface.co/spaces/Really-amin/Datasourceforcryptocurrency

**Note**: You do NOT need to modify the HuggingFace Space code. This project integrates with the existing deployed Space.

### API Keys (Optional)

Configure API keys for data providers (leave empty to disable):

- **CMC_API_KEY**: CoinMarketCap API ([Get Key](https://coinmarketcap.com/api/))
- **CRYPTOCOMPARE_KEY**: CryptoCompare API ([Get Key](https://min-api.cryptocompare.com/))
- **NEWSAPI_KEY**: NewsAPI ([Get Key](https://newsapi.org/))
- **ETHERSCAN_API_KEY**: Etherscan blockchain data ([Get Key](https://etherscan.io/apis))
- **BSCSCAN_API_KEY**: BscScan blockchain data ([Get Key](https://bscscan.com/apis))
- **TRONSCAN_API_KEY**: TronScan blockchain data ([Get Key](https://www.tronscan.org/))
- **HUGGINGFACE_API_KEY**: Hugging Face API for ML features ([Get Key](https://huggingface.co/settings/tokens)) - See [Setup Guide](docs/HUGGINGFACE_SETUP.md)

### Futures Trading (Optional)

For KuCoin Futures trading:

- **KUCOIN_FUTURES_KEY**: API Key
- **KUCOIN_FUTURES_SECRET**: API Secret
- **KUCOIN_FUTURES_PASSPHRASE**: API Passphrase

Get credentials from [KuCoin API Management](https://www.kucoin.com/account/api).

### Redis (Optional)

For distributed caching:

```env
DISABLE_REDIS=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Telegram (Optional)

For signal notifications:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

## Running Backend and WebSocket

The backend server provides:

- **REST API** at `http://localhost:3001/api/*`
- **WebSocket** at `ws://localhost:3001/ws`
- **Health Check** at `http://localhost:3001/api/health`

WebSocket channels:
- `/ws` - General market data and signals
- `/ws/futures` - Futures trading updates (when `FEATURE_FUTURES=true`)

## Production Deployment

### Docker

```bash
# Build the Docker image
docker build -t dreammaker-crypto .

# Run the container
docker run -p 3001:3001 --env-file .env dreammaker-crypto
```

### Docker Compose (with Nginx)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Railway

The project includes `railway.json` for one-click deployment:

1. Connect your GitHub repository to Railway
2. Configure environment variables in Railway dashboard
3. Deploy automatically on push to main branch

Health check endpoint: `/api/health`

### Manual Deployment

1. Build the project: `npm run build`
2. Serve `dist/` folder with Nginx (use included `nginx.conf`)
3. Start backend: `npm start`
4. Configure reverse proxy for `/api` and `/ws` endpoints

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server (frontend + backend) |
| `npm run dev:client` | Start only frontend dev server |
| `npm run dev:server` | Start only backend dev server |
| `npm run build` | Build production bundles |
| `npm run build:client` | Build frontend only |
| `npm run build:server` | Build backend only |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:hf` | Test Hugging Face integration |
| `npm run typecheck` | TypeScript type checking |

## Project Structure

```
├── src/
│   ├── components/        # React components
│   ├── views/            # Page-level views
│   ├── services/         # Business logic and API clients
│   ├── engine/           # Trading signal engine
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── controllers/      # Backend API controllers
│   ├── ws/               # WebSocket handlers
│   ├── core/             # Core services (Logger, Cache, etc.)
│   ├── server.ts         # Backend entry point
│   └── main.tsx          # Frontend entry point
├── public/               # Static assets
├── config/               # Configuration files (auto-generated)
├── data/                 # Database and cache storage
├── docs/                 # Documentation
├── archive/              # Archived files
└── scripts/              # Build and utility scripts
```

## Troubleshooting

### Common Errors

**Error: `Cannot find module 'better-sqlite3'`**
```bash
npm rebuild better-sqlite3
```

**Error: `EADDRINUSE: address already in use :::3001`**
```bash
# Kill process using port 3001
lsof -ti:3001 | xargs kill -9
# Or change PORT in .env file
```

**Error: `Redis connection failed`**
```bash
# Disable Redis if not needed
echo "DISABLE_REDIS=true" >> .env
```

**Error: `API rate limit exceeded`**
- Add API keys to `.env` for higher rate limits
- Enable Redis caching to reduce API calls
- Increase `PROVIDER_TTL_MS` and `PRICE_CACHE_TTL_MS` in `.env`

**Build fails with TypeScript errors**
```bash
# Run type checking
npm run typecheck

# Check for missing dependencies
npm install
```

**WebSocket connection fails**
- Ensure backend is running (`npm run dev:server`)
- Check firewall settings for port 3001
- Verify `VITE_WS_BASE` in frontend matches backend URL

### Development Issues

**Hot reload not working**
- Make sure Vite dev server is running on port 5173
- Check browser console for errors
- Clear browser cache and restart dev server

**Database locked errors**
- Ensure only one instance of the server is running
- Delete `data/*.db-wal` and `data/*.db-shm` files
- Restart the server

### Performance Optimization

1. **Enable Redis**: Set `DISABLE_REDIS=false` and configure Redis connection
2. **Adjust Cache TTL**: Increase `PROVIDER_TTL_MS` and `PRICE_CACHE_TTL_MS`
3. **Limit API Providers**: Disable unused providers by leaving API keys empty
4. **Use Production Build**: Run `npm run build` and `npm start` for optimized bundle

## Security Notes

⚠️ **IMPORTANT SECURITY PRACTICES**:

1. **Never commit secrets**: `.env` file is gitignored - keep it that way
2. **Use environment variables**: Never hardcode API keys or passwords
3. **Rotate API keys**: Regularly rotate credentials, especially after team changes
4. **Limit API permissions**: Use read-only keys where possible
5. **Enable IP whitelisting**: Configure IP restrictions on exchange APIs
6. **Use strong passphrases**: For KuCoin Futures API credentials
7. **Monitor logs**: Check `logs/` directory for suspicious activity
8. **Keep dependencies updated**: Run `npm audit` regularly

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/engine/__tests__/scoring.test.ts
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

This project is released into the public domain under the [Unlicense](LICENSE).

## Support

- **Issues**: [GitHub Issues](https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader/issues)
- **Documentation**: See `docs/` directory for detailed guides
- **Archived Docs**: See `archive/2025-11-07/` for legacy documentation

## Operations (Update)

### Health & Monitoring

- **Health Check**: GET `/status/health` for simple liveness checks (returns `{ ok: true, ts: <timestamp> }`)
- **Detailed Health**: GET `/api/health` for comprehensive system health including exchange connections, Redis status, and data quality metrics
- **WebSocket Heartbeat**: Server-side ping/pong mechanism automatically detects and terminates dead WebSocket connections every 30 seconds
- **Graceful Shutdown**: Server properly closes connections on `SIGINT` and `SIGTERM` signals

### Environment Validation

The server validates required environment variables on startup and exits early with clear error messages if critical configuration is missing. Currently validates:
- `PORT` - Server port (default: 3001)

Add additional required environment variables to `src/server/envGuard.ts` as needed.

### Windows Development

Windows-friendly PowerShell scripts are provided for a better development experience:

```powershell
# Start development server (Windows)
npm run dev:win

# Build and preview production (Windows)
npm run preview:win
```

These scripts automatically:
- Check for `.env` file existence and create from `.env.example` if missing
- Provide colored output and clear status messages
- Handle errors gracefully with proper exit codes

**Note**: The standard `npm run dev` and `npm run preview` commands work on all platforms, including Windows. The `:win` variants are optional and provide enhanced PowerShell-specific features.

**Windows Setup Issues?** See the comprehensive [Windows Setup Guide](docs/WINDOWS_SETUP.md) for fixing common issues including:
- `patch-package not found` errors
- `better-sqlite3` native binding failures
- Visual Studio Build Tools configuration
- node-gyp compilation errors

### Error Handling

The frontend includes a crash-safe error boundary that prevents white screens when component errors occur. Errors are:
- Logged to console in development mode
- Captured with component stack traces
- Displayed with a user-friendly recovery UI
- Recoverable via "Try again" button

### Docker & Nginx (Optional - Production)

For containerized production deployments, optional enhancements are available:

**Nginx Configuration** (append to your `nginx.conf`):
```nginx
# Performance & Security
gzip on;
gzip_types text/css application/javascript application/json image/svg+xml;
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header Referrer-Policy "strict-origin-when-cross-origin";

# Static asset caching
location ~* \.(js|css|svg|png|jpg|gif)$ {
  expires 7d;
  add_header Cache-Control "public, max-age=604800, immutable";
}
```

**Dockerfile Healthcheck** (add to your `Dockerfile`):
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD wget -qO- http://localhost:${PORT:-3001}/status/health || exit 1
```



---

## Archived Markdown Documentation

**Archive Date:** November 22, 2025 (20251122_090758)

All previous markdown documentation files have been systematically archived to preserve git history while maintaining a clean repository structure. This canonical README serves as the primary entry point and index for all documentation.

### 📁 Project Structure

| Directory | Description |
|-----------|-------------|
| `archive/` | Archived legacy files |
| `artifacts/` | Build artifacts and reports |
| `backend-examples/` | Backend code examples |
| `config/` | Configuration files |
| `cursor_discovery/` | Cursor discovery data |
| `cursor_reports/` | Cursor AI reports |
| `deploy/` | Deployment configurations |
| `docs/` | Documentation and archived files |
| `e2e/` | End-to-end tests |
| `examples/` | Code examples |
| `integrations/` | Third-party integrations |
| `ml/` | Machine learning models |
| `nginx/` | Nginx configuration |
| `patches/` | Patch files |
| `public/` | Static assets |
| `reports/` | Diagnostic reports |
| `scripts/` | Build and utility scripts |
| `src/` | Source code (frontend & backend) |
| `tests/` | Test suites |
| `tools/` | Development tools |

### 📚 Archived Documents Index

All 220 markdown files have been moved to [`docs/markdown_archive/20251122_090758/`](./docs/markdown_archive/20251122_090758/) with full metadata preservation.

<details>
<summary><strong>View Complete Archive Index (220 documents)</strong></summary>

| Original Path | Title | Summary |
|---------------|-------|----------|
| [`docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE/01-hf-adapter-scope.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE/01-hf-adapter-scope.md) | docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE | --- name: HF Adapter Scope Clarification |
| [`docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE/02-auto-refresh-user-control.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE/02-auto-refresh-user-control.md) | docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE | --- name: Auto-refresh with user control |
| [`docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE/03-hash-based-navigation.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE/03-hash-based-navigation.md) | docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE | --- name: Hash-based navigation |
| [`docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE/04-minimal-tests.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE/04-minimal-tests.md) | docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE | --- name: Minimal tests for RiskGuard & TradeEngine |
| [`docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE/05-exchange-selector-cleanup.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE/05-exchange-selector-cleanup.md) | docs/markdown_archive/20251122_090758/.github/ISSUE_TEMPLATE | --- name: Exchange selector cleanup |
| [`docs/markdown_archive/20251122_090758/API_KEYS_STATUS.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/API_KEYS_STATUS.md) | 🔑 API Keys Status and Replacement Guide | Last Updated: 2025-11-09 - **Status:** ✅ Working |
| [`docs/markdown_archive/20251122_090758/API_ROUTING_VALIDATION_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/API_ROUTING_VALIDATION_REPORT.md) | API Routing Validation Report | **Comprehensive Validation of All API Endpoints and Response Envelopes** --- |
| [`docs/markdown_archive/20251122_090758/API_SETUP_GUIDE_FA.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/API_SETUP_GUIDE_FA.md) | 🔑 راهنمای کامل پیکربندی API Keys | این راهنما به شما کمک می‌کند تا تمام کلیدهای API مورد نیاز را برای فعال‌سازی کامل پروژه DreammakerCryptoSignalAndTrader  |
| [`docs/markdown_archive/20251122_090758/API_TESTING_COMPLETE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/API_TESTING_COMPLETE.md) | ✅ ماژول تست API - تکمیل شده | یک **ماژول کامل و حرفه‌ای** برای تست خودکار API با موفقیت ایجاد و در پروژه بارگذاری شد. --- |
| [`docs/markdown_archive/20251122_090758/API_TESTING_MODULE_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/API_TESTING_MODULE_SUMMARY.md) | خلاصه ماژول تست API | 1. **`src/testing/api-test-framework.ts`** (432 خط)    - چارچوب اصلی تست API |
| [`docs/markdown_archive/20251122_090758/API_TESTING_README.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/API_TESTING_README.md) | 🧪 ماژول تست API - راهنمای سریع | > یک ماژول قدرتمند برای تست خودکار API با قابلیت‌های پیشرفته این ماژول برای **جلوگیری از بازگشت خطاها** و **اطمینان از  |
| [`docs/markdown_archive/20251122_090758/APP_STATUS_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/APP_STATUS_REPORT.md) | گزارش وضعیت برنامه Dreammaker Crypto Signal & Trader | **تاریخ:** 2025-11-14 **ساعت:** 19:42 UTC |
| [`docs/markdown_archive/20251122_090758/ARCHITECTURE_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/ARCHITECTURE_REPORT.md) | Complete Architecture Report | **Generated:** Based on direct code inspection (no assumptions)   **Date:** 2025-11-16 |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/CHANGELOG.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/CHANGELOG.md) | Changelog | All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://k |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/DEPLOYMENT_CHECKLIST_TIGHT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/DEPLOYMENT_CHECKLIST_TIGHT.md) | Deployment Checklist - Tight Do-This-Now Guide | **Status:** ✅ Code on `main` - Ready for deployment   **Time Estimate:** ~30 min staging + ~15 min production |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/DEPLOYMENT_CHECKLIST.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/DEPLOYMENT_CHECKLIST.md) | Futures Integration - Pre-Deployment Checklist | **Use this checklist before enabling futures trading in production.** --- |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/DEPLOYMENT_PLAYBOOK.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/DEPLOYMENT_PLAYBOOK.md) | Production Rollout Playbook | **Status:** ✅ Code merged to `main` - Ready for deployment --- |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/DEPLOYMENT_STATUS.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/DEPLOYMENT_STATUS.md) | Deployment Status | **Date:** 2025-11-06   **Integration:** KuCoin Futures via adapter pattern |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/FINAL_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/FINAL_SUMMARY.md) | 🎯 Final Integration Summary | **Integration Status:** ✅ **COMPLETE & READY FOR DEPLOYMENT** --- |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/FINALIZATION_STATUS.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/FINALIZATION_STATUS.md) | ✅ Finalization Complete - PR Ready for Review | **Date:** 2025-11-06   **PR:** #1 - https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader/pull/1 |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/FUTURES_INTEGRATION_FINAL_STATUS.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/FUTURES_INTEGRATION_FINAL_STATUS.md) | Futures Integration - Final Status Report | **Date:** 2025-11-06   **Branch:** `feature/futures-integration` |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/FUTURES_QUICKSTART.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/FUTURES_QUICKSTART.md) | Futures Integration - Quick Start Guide | The futures trading capabilities from Project A have been successfully integrated into Project B (baseline crypto-scorin |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/GIT_WORKFLOW.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/GIT_WORKFLOW.md) | Safe Push & Merge to `main` - Futures Integration | **Purpose:** Safe, repeatable workflow to land the futures integration into `main` with minimal risk and instant rollbac |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/GO_LIVE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/GO_LIVE.md) | 🚀 Go-Live Summary - Futures Integration | **Status:** ✅ **READY FOR DEPLOYMENT** **Date:** 2025-11-06 |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/INCREMENTAL_UPGRADE_SCAN_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/INCREMENTAL_UPGRADE_SCAN_REPORT.md) | Incremental Upgrade Scan Report | **Date:** 2025-11-07 **Mode:** Non-Breaking Enhancement (Security Unchanged) |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/INTEGRATION_COMPLETE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/INTEGRATION_COMPLETE.md) | Integration Complete - Ready for Testing & Merge | All integration work is complete and committed to `feature/futures-integration` branch. --- |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/INTEGRATION_PROMPT_ALIGNMENT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/INTEGRATION_PROMPT_ALIGNMENT.md) | Integration Prompt Alignment — Final | **Summary:** The integration follows Project B's architecture, is feature-flagged for safe rollout, and maintains backwa |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/PR_DESCRIPTION.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/PR_DESCRIPTION.md) | PR Description Template | ``` feat(futures): adapter-based futures integration behind flag |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/PR_MERGE_CHECKLIST.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/PR_MERGE_CHECKLIST.md) | PR Merge Checklist | **Branch:** `feature/futures-integration`   **Target:** `main` |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/PROJECT_ANALYSIS_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/PROJECT_ANALYSIS_REPORT.md) | Project Analysis & UI Review Report | This comprehensive analysis of the crypto trading platform reveals a well-structured React/TypeScript application with m |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/PROJECT_ANALYSIS.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/PROJECT_ANALYSIS.md) | 🔎 PROJECT ANALYSIS REPORT | **Analysis Date:** 2025-01-27   **Project Root:** `/workspace` |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/REPOSITORY_STATUS_FINAL.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/REPOSITORY_STATUS_FINAL.md) | Repository Status - Final Verification | **Date:** 2025-11-06   **Branch:** `main` |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/RUNBOOK.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/RUNBOOK.md) | Futures Trading Integration - Operations Runbook | **Version:** 1.0   **Last Updated:** 2025-11-06 |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/SCORING_FIX_COMPLETE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/SCORING_FIX_COMPLETE.md) | 🔧 گزارش کامل تغییرات سیستم Scoring | سیستم Quantum Scoring که شامل 8-9 مرحله تحلیل است، روت‌های API آن در فایل `server.ts` تعریف شده بود، در حالی که اسکریپت  |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/SCORING_FIX_SUMMARY_EN.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/SCORING_FIX_SUMMARY_EN.md) | Quantum Scoring System - Integration Complete ✅ | The Quantum Scoring System (8-9 stage analysis pipeline) had its API routes defined in `server.ts`, but the dev script w |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/STATUS.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/STATUS.md) | 🎉 Integration Complete - Final Status | **Date:** 2025-11-06   **Integration:** KuCoin Futures via adapter pattern |
| [`docs/markdown_archive/20251122_090758/archive/2025-11-07/VALIDATION_CHECKLIST.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/archive/2025-11-07/VALIDATION_CHECKLIST.md) | Validation & PR Finalization Checklist | **Branch:** `feature/futures-integration`   **Status:** ✅ Code Complete - Ready for Testing |
| [`docs/markdown_archive/20251122_090758/artifacts/15m_signal_report.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/artifacts/15m_signal_report.md) | 15-Minute Signal Test Report | **Test Date**: 2025-11-07 **Environment**: Development (Node.js v22.21.1, Linux) |
| [`docs/markdown_archive/20251122_090758/artifacts/COMPLETION_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/artifacts/COMPLETION_REPORT.md) | 🎉 KuCoin Integration - Completion Report | **Project:** crypto-scoring-fixed   **Completion Date:** January 5, 2025 |
| [`docs/markdown_archive/20251122_090758/artifacts/dependency_map.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/artifacts/dependency_map.md) | Dependency Map | - `src/server.ts` wires Express routes and WebSocket handlers to singleton services. It imports `Logger`, `ConfigManager |
| [`docs/markdown_archive/20251122_090758/artifacts/FUTURES_INTEGRATION_COMPLETE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/artifacts/FUTURES_INTEGRATION_COMPLETE.md) | Futures Trading Integration - Completion Report | Successfully integrated Futures trading capabilities from Project A (DreammakerFinalBoltaiCryptoSignalAndTrader) into Pr |
| [`docs/markdown_archive/20251122_090758/artifacts/patches/PATCHES_APPLIED.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/artifacts/patches/PATCHES_APPLIED.md) | 🔧 Critical Patches Applied - KuCoin Integration Optimizatio | **Date:** January 5, 2025   **Status:** ✅ **COMPLETED** |
| [`docs/markdown_archive/20251122_090758/artifacts/PHASE2_PATCHES_COMPLETE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/artifacts/PHASE2_PATCHES_COMPLETE.md) | ✅ Phase 2 Transition Complete - Patches Applied, Ready for R | **Date:** January 5, 2025   **Status:** ✅ **PATCHES DEPLOYED - AWAITING RUNTIME VERIFICATION** |
| [`docs/markdown_archive/20251122_090758/artifacts/PRODUCTION_READINESS_FINAL_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/artifacts/PRODUCTION_READINESS_FINAL_REPORT.md) | 🎯 Production Readiness Verification - Final Report | **Project:** crypto-scoring-fixed (KuCoin Integration)   **Verification Date:** January 5, 2025 |
| [`docs/markdown_archive/20251122_090758/artifacts/REPORT_kucoin_delta.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/artifacts/REPORT_kucoin_delta.md) | 🔍 KuCoin Integration Delta Report | **Date:** January 5, 2025   **Baseline:** PROJECT_ANALYSIS_CHECKLIST.md & KUCOIN_INTEGRATION_FINAL_REPORT.md |
| [`docs/markdown_archive/20251122_090758/artifacts/REPORT_static_analysis.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/artifacts/REPORT_static_analysis.md) | 📋 Static Analysis Report - KuCoin Integration | **Date:** January 5, 2025   **Project:** crypto-scoring-fixed |
| [`docs/markdown_archive/20251122_090758/artifacts/REPORT_test_coverage.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/artifacts/REPORT_test_coverage.md) | 📊 Test Coverage Report - Phase 8 | **Date:** January 5, 2025   **Status:** ✅ **ANALYSIS COMPLETE** |
| [`docs/markdown_archive/20251122_090758/artifacts/search_hits.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/artifacts/search_hits.md) | Search Hits | Command: `rg -n --glob 'src/**' "createServer\|app\\.listen\|express" -S` - src/server.ts:1 `import express from 'express' |
| [`docs/markdown_archive/20251122_090758/artifacts/VERIFICATION_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/artifacts/VERIFICATION_SUMMARY.md) | 🎯 KuCoin Integration Production Readiness - Verification Su | **Date:** January 5, 2025   **Project:** crypto-scoring-fixed |
| [`docs/markdown_archive/20251122_090758/AUDIT_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/AUDIT_REPORT.md) | 🔍 DEEP CODEBASE AUDIT REPORT | **Generated:** 2025-11-14 **Project:** Dreammaker Legal Agent - Crypto/AI Dashboard |
| [`docs/markdown_archive/20251122_090758/backend_route_analysis.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/backend_route_analysis.md) | Backend Route Analysis | **Status:** All routes have been updated with API v1 versioning All API routes now follow the pattern: `/api/v1/{resourc |
| [`docs/markdown_archive/20251122_090758/CHANGELOG.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/CHANGELOG.md) | CHANGELOG - Audit & Hardening (2025-11-08) | Complete audit and hardening of DreammakerCryptoSignalAndTrader to eliminate accidental synthetic data on production pat |
| [`docs/markdown_archive/20251122_090758/CHART_VALIDATION_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/CHART_VALIDATION_REPORT.md) | Chart Validation Report | **Comprehensive Testing of All Chart Components and Visualizations** --- |
| [`docs/markdown_archive/20251122_090758/CHECKLIST_EXPORT_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/CHECKLIST_EXPORT_SUMMARY.md) | Production Checklist Export - Summary | **Date:** 2025-11-16   **Status:** ✅ Complete |
| [`docs/markdown_archive/20251122_090758/CHECKLIST_MANIFEST.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/CHECKLIST_MANIFEST.md) | Checklist Export Manifest | **Created:** 2025-11-16   **Purpose:** Production checklist export to JSON and GitHub issue templates |
| [`docs/markdown_archive/20251122_090758/CODE_CHANGES_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/CODE_CHANGES_SUMMARY.md) | CODE CHANGES SUMMARY - Frontend Synchronization | ```bash PRIMARY_DATA_SOURCE=huggingface |
| [`docs/markdown_archive/20251122_090758/COMPLETION_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/COMPLETION_REPORT.md) | 🎯 Complete Implementation & Testing Report | **Project:** DreammakerCryptoSignalAndTrader **Date:** 2025-11-09 |
| [`docs/markdown_archive/20251122_090758/COMPREHENSIVE_ACID_TEST_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/COMPREHENSIVE_ACID_TEST_REPORT.md) | 🔬 COMPREHENSIVE ACID TEST REPORT | **Test Date:** 2025-11-22   **Testing Environment:** Offline Mode + Live Backend |
| [`docs/markdown_archive/20251122_090758/COMPREHENSIVE_TEST_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/COMPREHENSIVE_TEST_REPORT.md) | گزارش تست جامع پروژه | تاریخ: 2025-11-09 نسخه: 1.0.0 |
| [`docs/markdown_archive/20251122_090758/cursor_reports/backend_followups.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/cursor_reports/backend_followups.md) | Backend Integration Follow-ups | This document describes backend changes required to fully support the no-mock-data frontend implementation. The fronten |
| [`docs/markdown_archive/20251122_090758/cursor_reports/COMPLETION_VERIFICATION.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/cursor_reports/COMPLETION_VERIFICATION.md) | ✅ Full Frontend Remediation - COMPLETED | **Completion Date:** 2025-11-22   **Status:** All objectives achieved |
| [`docs/markdown_archive/20251122_090758/cursor_reports/EXECUTION_LOG.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/cursor_reports/EXECUTION_LOG.md) | Execution Log - Frontend & Integration Verification | **Start Time:** 2025-11-22T00:00:00Z   **End Time:** 2025-11-22T00:30:00Z |
| [`docs/markdown_archive/20251122_090758/cursor_reports/pr_description.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/cursor_reports/pr_description.md) | Frontend & Integration Verification - Comprehensive Error Ha | This PR implements comprehensive error handling and standardization across the entire frontend and integration layer. Al |
| [`docs/markdown_archive/20251122_090758/cursor_reports/summary.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/cursor_reports/summary.md) | Frontend Remediation Summary - No Mock Data Policy | **Report Date:** 2025-11-22   **Status:** ✅ Completed |
| [`docs/markdown_archive/20251122_090758/cursor_reports/views_assessment_summary.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/cursor_reports/views_assessment_summary.md) | Views Assessment Summary | **Assessment Date:** 2025-11-22   **Total Views Assessed:** 26 |
| [`docs/markdown_archive/20251122_090758/cursor_reports/views_test_cases.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/cursor_reports/views_test_cases.md) | Test Cases for Views Scored ≤7 | **Generated**: 2025-11-22   **Purpose**: Minimal reproducible test cases demonstrating missing functionality, failing i |
| [`docs/markdown_archive/20251122_090758/DASHBOARD_OPTIMIZATION_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/DASHBOARD_OPTIMIZATION_REPORT.md) | Dashboard Optimization & Performance Fix Report | Successfully completed optimization of the main dashboard to eliminate request storms and improve visual/UX quality with |
| [`docs/markdown_archive/20251122_090758/DATA_FETCH_WEBSOCKET_AUDIT_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/DATA_FETCH_WEBSOCKET_AUDIT_REPORT.md) | 🔍 FULL DATA PATH DIAGNOSTIC REPORT | **Date**: 2025-11-16   **Scope**: Complete audit of REST API + WebSocket data paths |
| [`docs/markdown_archive/20251122_090758/DATA_REQUIREMENTS_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/DATA_REQUIREMENTS_REPORT.md) | گزارش نیازمندی‌های داده برنامه | برنامه Dreammaker برای تولید سیگنال‌های معاملاتی به این داده‌ها نیاز دارد: ``` |
| [`docs/markdown_archive/20251122_090758/DEBUGGING_COMPLETE_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/DEBUGGING_COMPLETE_SUMMARY.md) | ✅ DEBUGGING COMPLETE - Spot/Futures Realtime Sync Fixed | **Date**: 2025-11-16   **Status**: ✅ **ALL TASKS COMPLETED** |
| [`docs/markdown_archive/20251122_090758/DEBUGGING_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/DEBUGGING_REPORT.md) | Comprehensive Debugging Report | **Date**: 2025-11-09 **Session**: claude/debugging-session-011CUyCW8estqwCn7uH7uXaf |
| [`docs/markdown_archive/20251122_090758/DEPLOY_TO_HF.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/DEPLOY_TO_HF.md) | راهنمای سریع Deploy به Hugging Face Spaces | 1. برید به: https://huggingface.co/new-space 2. اطلاعات رو پر کنید: |
| [`docs/markdown_archive/20251122_090758/deploy/TESTING.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/deploy/TESTING.md) | Local Testing & Release Guide | ```bash cd deploy |
| [`docs/markdown_archive/20251122_090758/DEPLOYMENT_IMPLEMENTATION_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/DEPLOYMENT_IMPLEMENTATION_REPORT.md) | Deployment Implementation Report | **Date**: 2025-11-16   **Status**: ✅ **COMPLETE** |
| [`docs/markdown_archive/20251122_090758/DEPLOYMENT_READINESS_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/DEPLOYMENT_READINESS_SUMMARY.md) | Deployment Readiness Summary | **Project**: DreammakerCryptoSignalAndTrader   **Date**: 2025-11-16 |
| [`docs/markdown_archive/20251122_090758/DEPLOYMENT_READY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/DEPLOYMENT_READY.md) | ✅ DEPLOYMENT READY - All Changes Committed and Pushed | **Date**: 2025-11-16   **Status**: ✅ **READY FOR DEPLOYMENT** |
| [`docs/markdown_archive/20251122_090758/DIAGNOSTIC_REPORT_FULL.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/DIAGNOSTIC_REPORT_FULL.md) | 🔴 COMPREHENSIVE DIAGNOSTIC REPORT | **Generated**: 2025-11-16   **Project**: React + TypeScript Crypto Dashboard (Vite + FastAPI Backend) |
| [`docs/markdown_archive/20251122_090758/DIAGNOSTICS_SYSTEM.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/DIAGNOSTICS_SYSTEM.md) | Provider Diagnostics System | This document describes the Provider Diagnostics System implemented as part of the HuggingFace Integration Completion ph |
| [`docs/markdown_archive/20251122_090758/docs/API_FIXES_AND_IMPROVEMENTS.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/API_FIXES_AND_IMPROVEMENTS.md) | API Fixes and Improvements | This document describes the comprehensive fixes applied to resolve CORS, rate limiting, and API reliability issues. **Pr |
| [`docs/markdown_archive/20251122_090758/docs/API_INTEGRATION_GUIDE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/API_INTEGRATION_GUIDE.md) | API Integration Guide | This project now includes a comprehensive multi-source API integration system that provides: - ✅ **Load Balancing**: Aut |
| [`docs/markdown_archive/20251122_090758/docs/API_OPTIMIZATION.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/API_OPTIMIZATION.md) | بهینه‌سازی درخواست‌های API | پروژه دارای مشکلات جدی در تعداد درخواست‌های API بود: 1. **6 interval همپوشان 30 ثانیه‌ای**: |
| [`docs/markdown_archive/20251122_090758/docs/API_TESTING_GUIDE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/API_TESTING_GUIDE.md) | راهنمای جامع تست API | این راهنما شامل اطلاعات کامل برای استفاده از ماژول تست API است. 1. [معرفی](#معرفی) |
| [`docs/markdown_archive/20251122_090758/docs/ARCHITECTURE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/ARCHITECTURE.md) | docs/markdown_archive/20251122_090758/docs/ARCHITECTURE | - `src/server.ts` – single Express entrypoint exposing REST + WebSocket interfaces and wiring all singleton services. -  |
| [`docs/markdown_archive/20251122_090758/docs/assimilation/00_report.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/assimilation/00_report.md) | Assimilation Report - Stage 0 | **Document Version:** 1.0   **Date:** 2025-11-06 |
| [`docs/markdown_archive/20251122_090758/docs/assimilation/01_doc_code_alignment.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/assimilation/01_doc_code_alignment.md) | Doc-Code Alignment Report | **Document Version:** 1.0   **Date:** 2025-11-06 |
| [`docs/markdown_archive/20251122_090758/docs/assimilation/02_inventory_A.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/assimilation/02_inventory_A.md) | Inventory Report - Project A (Donor) | **Document Version:** 1.0   **Date:** 2025-11-06 |
| [`docs/markdown_archive/20251122_090758/docs/assimilation/03_capability_matrix.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/assimilation/03_capability_matrix.md) | Capability Matrix & Unification Plan | **Document Version:** 1.0   **Date:** 2025-11-06 |
| [`docs/markdown_archive/20251122_090758/docs/assimilation/FINAL_COMPLETION_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/assimilation/FINAL_COMPLETION_REPORT.md) | Final Integration Report | **Date:** 2025-11-06   **Branch:** `feature/futures-integration` |
| [`docs/markdown_archive/20251122_090758/docs/assimilation/INTEGRATION_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/assimilation/INTEGRATION_SUMMARY.md) | Futures Integration - Final Summary | **Date:** 2025-11-06   **Branch:** `feature/futures-integration` |
| [`docs/markdown_archive/20251122_090758/docs/assimilation/KUCOIN_API_FIXES.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/assimilation/KUCOIN_API_FIXES.md) | KuCoin API Fixes Applied | **Date:** 2025-11-06   **Status:** ✅ **FIXES APPLIED** |
| [`docs/markdown_archive/20251122_090758/docs/assimilation/VERIFICATION_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/assimilation/VERIFICATION_SUMMARY.md) | KuCoin API Fixes - Verification Summary | **Date:** 2025-11-06   **Branch:** `feature/futures-integration` |
| [`docs/markdown_archive/20251122_090758/docs/CHECKLIST_USAGE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/CHECKLIST_USAGE.md) | Production Checklist Usage Guide | This document explains how to use the production checklist system for the DreammakerCryptoSignalAndTrader project. The  |
| [`docs/markdown_archive/20251122_090758/docs/ci-cd.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/ci-cd.md) | CI/CD Pipeline Guide | This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the DreammakerCryptoSi |
| [`docs/markdown_archive/20251122_090758/docs/COMPLETE_INTEGRATION.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/COMPLETE_INTEGRATION.md) | Complete System Integration Documentation | این مستندات اتصال کامل همه مؤلفه‌های سیستم را نشان می‌دهد. 1. **XavierInitializer** - وزن‌دهی اولیه شبکه عصبی |
| [`docs/markdown_archive/20251122_090758/docs/DATA_POLICY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/DATA_POLICY.md) | Data Policy Documentation | This document describes the strict data policy enforced across the DreammakerCryptoSignalAndTrader application. The poli |
| [`docs/markdown_archive/20251122_090758/docs/data-flow.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/data-flow.md) | Data Flow Architecture | **Last Updated:** 2025-11-16   **Type:** Reality Check (What Actually Runs, Not Vision) |
| [`docs/markdown_archive/20251122_090758/docs/DEPLOYMENT_CHECKLIST.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/DEPLOYMENT_CHECKLIST.md) | Deployment Checklist | This comprehensive checklist ensures safe, reliable deployment of the DreammakerCryptoSignalAndTrader application to sta |
| [`docs/markdown_archive/20251122_090758/docs/docker-deployment.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/docker-deployment.md) | Docker Deployment Guide | This guide covers building and deploying the DreammakerCryptoSignalAndTrader application using Docker containers. The a |
| [`docs/markdown_archive/20251122_090758/docs/FREE_CRYPTO_APIS.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/FREE_CRYPTO_APIS.md) | Free & Unrestricted Crypto Data Sources | This document describes all the free crypto API integrations in this project. The `EnhancedMarketDataService` integrates |
| [`docs/markdown_archive/20251122_090758/docs/hf-engine-scope.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/hf-engine-scope.md) | HF Engine Scope & Boundaries | **Last Updated:** 2025-11-16   **Purpose:** Clarify what HF (Hugging Face) Data Engine does and does NOT do |
| [`docs/markdown_archive/20251122_090758/docs/HUGGINGFACE_SETUP.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/HUGGINGFACE_SETUP.md) | Hugging Face Integration Setup | This guide explains how to configure Hugging Face API tokens for the DreammakerCryptoSignalAndTrader project. Hugging Fa |
| [`docs/markdown_archive/20251122_090758/docs/logging-and-observability.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/logging-and-observability.md) | Logging and Observability | **Last Updated:** 2025-11-16   **Purpose:** Document logging practices and observability guidelines for production |
| [`docs/markdown_archive/20251122_090758/docs/LOGIC_OVERVIEW.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/LOGIC_OVERVIEW.md) | docs/markdown_archive/20251122_090758/docs/LOGIC_OVERVIEW | - **Market ingestion**: `MarketDataIngestionService` (`src/services/MarketDataIngestionService.ts:24-198`) subscribes to |
| [`docs/markdown_archive/20251122_090758/docs/New folder/ARCHITECTURE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/New folder/ARCHITECTURE.md) | Architecture Deep Dive | **Document Version:** 1.0   **Last Updated:** 2025-11-06 |
| [`docs/markdown_archive/20251122_090758/docs/New folder/DATA_MODEL.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/New folder/DATA_MODEL.md) | Data Model & Schema Documentation | **Document Version:** 1.0   **Last Updated:** 2025-11-06 |
| [`docs/markdown_archive/20251122_090758/docs/New folder/ENDPOINTS.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/New folder/ENDPOINTS.md) | API Endpoint Documentation | **Document Version:** 1.0   **Last Updated:** 2025-11-06 |
| [`docs/markdown_archive/20251122_090758/docs/New folder/FEATURES.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/New folder/FEATURES.md) | Feature Inventory | **Document Version:** 1.0   **Last Updated:** 2025-11-06 |
| [`docs/markdown_archive/20251122_090758/docs/New folder/QUICKSTART.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/New folder/QUICKSTART.md) | Quick Start Guide | **Document Version:** 1.0   **Last Updated:** 2025-11-06 |
| [`docs/markdown_archive/20251122_090758/docs/New folder/REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/New folder/REPORT.md) | Repository Reconnaissance Report | **Project:** BOLT AI - Advanced Cryptocurrency Neural AI Agent System   **Repository:** bolt-ai-crypto-agent |
| [`docs/markdown_archive/20251122_090758/docs/New folder/RISK_NOTES.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/New folder/RISK_NOTES.md) | Security & Risk Analysis | **Document Version:** 1.0   **Last Updated:** 2025-11-06 |
| [`docs/markdown_archive/20251122_090758/docs/New folder/TODO_FINDINGS.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/New folder/TODO_FINDINGS.md) | Technical Debt & TODO Findings | **Document Version:** 1.0   **Last Updated:** 2025-11-06 |
| [`docs/markdown_archive/20251122_090758/docs/OPS_NOTES.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/OPS_NOTES.md) | Operational Notes - Feature Flags & Metrics | \| Flag \| Default \| Description \| How to Toggle \| \|------\|---------\|-------------\|---------------\| |
| [`docs/markdown_archive/20251122_090758/docs/OPTIONAL_PROVIDERS.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/OPTIONAL_PROVIDERS.md) | Optional Data Providers | This document describes the **optional** alternative data providers that have been added to the project. These are **SAF |
| [`docs/markdown_archive/20251122_090758/docs/PLAYWRIGHT_TROUBLESHOOTING.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/PLAYWRIGHT_TROUBLESHOOTING.md) | راهنمای رفع مشکلات Playwright | این خطا زمانی رخ می‌دهد که Playwright نمی‌تواند به سرور محلی متصل شود. دلایل احتمالی: 1. **مشکل IPv6**: ویندوز سعی می‌ک |
| [`docs/markdown_archive/20251122_090758/docs/PRODUCTION_SMOKE_TEST_PLAN.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/PRODUCTION_SMOKE_TEST_PLAN.md) | Production Smoke Test Plan | **Last Updated:** 2025-11-16   **Purpose:** Provide a clear, repeatable manual test plan for validating production read |
| [`docs/markdown_archive/20251122_090758/docs/production-env-config.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/production-env-config.md) | Production Environment Configuration | **Last Updated:** 2025-11-16   **Purpose:** Define required environment variables for production deployment |
| [`docs/markdown_archive/20251122_090758/docs/PROJECT_AUDIT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/PROJECT_AUDIT.md) | docs/markdown_archive/20251122_090758/docs/PROJECT_AUDIT | BOLT AI runs an Express server (`src/server.ts`) that fronts a bundle of singleton services for market ingestion, analyt |
| [`docs/markdown_archive/20251122_090758/docs/README_enhanced_dashboard_pack.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/README_enhanced_dashboard_pack.md) | Enhanced Dashboard Pack — Chart + News + Sentiment + Signals | This pack adds **real-data** News/Sentiment integration bound to the selected symbol, plus a simple **enhanced symbol da |
| [`docs/markdown_archive/20251122_090758/docs/routes.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/routes.md) | API Routes Inventory | **Last Updated:** 2025-11-16   **Status:** Accurate for current build |
| [`docs/markdown_archive/20251122_090758/docs/runtime-profiles.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/runtime-profiles.md) | Runtime Profiles | This document explains the different runtime profiles available in the DreammakerCryptoSignalAndTrader application and h |
| [`docs/markdown_archive/20251122_090758/docs/STARTUP.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/STARTUP.md) | One-Command Setup & Run | This script provides a single command to install dependencies, configure environment, and start both backend and fronten |
| [`docs/markdown_archive/20251122_090758/docs/UI_VERIFICATION.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/UI_VERIFICATION.md) | UI Coherence Verification | This verification system uses Playwright and Axe to audit the UI for: - RTL (Right-to-Left) direction enforcement |
| [`docs/markdown_archive/20251122_090758/docs/VERIFICATION.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/VERIFICATION.md) | End-to-End Verification Script | This verification script (`scripts/verify_full.mjs`) performs a complete end-to-end functional verification of the crypt |
| [`docs/markdown_archive/20251122_090758/docs/WINDOWS_SETUP.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/docs/WINDOWS_SETUP.md) | Windows Setup & Fix Guide | Complete guide to fix common Windows development issues including `patch-package not found (exit code 127)` and native b |
| [`docs/markdown_archive/20251122_090758/ENTERPRISE_ENHANCEMENT_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/ENTERPRISE_ENHANCEMENT_REPORT.md) | 🚀 ENTERPRISE ENHANCEMENT - COMPLETE CHANGES REPORT | All MOCK DATA has been eliminated from the project and replaced with proper error handling.  The application now uses 10 |
| [`docs/markdown_archive/20251122_090758/ENV_SETUP_AND_RUN.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/ENV_SETUP_AND_RUN.md) | Environment Setup and Running Guide | This guide explains how to set up and run the Dreammaker Crypto Trading Dashboard on your local machine. --- |
| [`docs/markdown_archive/20251122_090758/FINAL_COMPLETE_TEST_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FINAL_COMPLETE_TEST_REPORT.md) | گزارش نهایی تست جامع پروژه | 📅 تاریخ: 2025-11-09 🏷️ نسخه: 1.0.0 |
| [`docs/markdown_archive/20251122_090758/FINAL_FIXES_APPLIED.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FINAL_FIXES_APPLIED.md) | ✅ FINAL VERIFICATION FIXES APPLIED | **Date:** 2025-11-16 **Branch:** cursor/final-verification-and-self-correction-prompt-91d9 |
| [`docs/markdown_archive/20251122_090758/FINAL_IMPLEMENTATION_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FINAL_IMPLEMENTATION_REPORT.md) | ✅ FINAL IMPLEMENTATION REPORT | **Date**: 2025-11-16   **Agent**: Cursor/Claude Code |
| [`docs/markdown_archive/20251122_090758/FINAL_UI_FUNCTIONALITY_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FINAL_UI_FUNCTIONALITY_REPORT.md) | Final UI Functionality Report | **Generated:** 2025-11-14 **Assessment Type:** Post-Implementation Technical Audit |
| [`docs/markdown_archive/20251122_090758/FINAL_VERIFICATION_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FINAL_VERIFICATION_REPORT.md) | 🔍 FINAL VERIFICATION & HONEST AUDIT REPORT | **Generated:** 2025-11-16 **Branch:** cursor/final-verification-and-self-correction-prompt-91d9 |
| [`docs/markdown_archive/20251122_090758/FINAL_VIEWS_AUDIT_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FINAL_VIEWS_AUDIT_REPORT.md) | 📊 گزارش نهایی بررسی جامع Views | **تاریخ:** 2025-11-10   **مدت زمان بررسی:** 2 ساعت |
| [`docs/markdown_archive/20251122_090758/FIXES_APPLIED_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FIXES_APPLIED_REPORT.md) | 🎯 FIXES APPLIED REPORT - Realtime Data Sync & WebSocket Iss | **Date**: 2025-11-16   **Agent**: Cursor Background Agent |
| [`docs/markdown_archive/20251122_090758/FIXES_APPLIED_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FIXES_APPLIED_SUMMARY.md) | ✅ FIXES APPLIED SUMMARY | **Date**: 2025-11-16   **Status**: **COMPLETE** ✅ |
| [`docs/markdown_archive/20251122_090758/FIXES_APPLIED.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FIXES_APPLIED.md) | تمام اصلاحات انجام شده | - اضافه شدن loading states به تمام views - اضافه شدن error boundaries |
| [`docs/markdown_archive/20251122_090758/FIXES_QUICK_REFERENCE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FIXES_QUICK_REFERENCE.md) | 🚀 QUICK REFERENCE - What Changed & How to Use | **Quick 2-minute guide to the most important changes** --- |
| [`docs/markdown_archive/20251122_090758/FIXES_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FIXES_SUMMARY.md) | ✅ DATA FETCH & WEBSOCKET FIXES APPLIED | **Date**: 2025-11-16   **Status**: ✅ COMPLETE |
| [`docs/markdown_archive/20251122_090758/FREE_RESOURCES_INTEGRATION_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FREE_RESOURCES_INTEGRATION_SUMMARY.md) | 📋 Free Resources Self-Test Integration Summary | تاریخ: 2025-11-10   نسخه: 1.0.0 |
| [`docs/markdown_archive/20251122_090758/FREE_RESOURCES_TEST_README.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FREE_RESOURCES_TEST_README.md) | Free Resources Self-Test | این مجموعه تست‌ها برای بررسی سلامت و در دسترس بودن APIهای رایگان خارجی و endpoint های محلی backend طراحی شده است. - ✅ ت |
| [`docs/markdown_archive/20251122_090758/FRONTEND_SYNC_COMPLETE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FRONTEND_SYNC_COMPLETE.md) | ✅ FRONTEND SYNCHRONIZATION COMPLETE | **Date:** 2025-11-21   **Mission:** Complete Frontend Synchronization & Verification |
| [`docs/markdown_archive/20251122_090758/FRONTEND_SYNCHRONIZATION_COMPLETE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FRONTEND_SYNCHRONIZATION_COMPLETE.md) | FRONTEND SYNCHRONIZATION & VERIFICATION COMPLETE ✅ | **Date:** 2025-11-21   **Objective:** Complete Frontend Synchronization to Hub-and-Spoke Architecture |
| [`docs/markdown_archive/20251122_090758/FRONTEND_VALIDATION_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/FRONTEND_VALIDATION_REPORT.md) | Frontend Functional Validation Report | **Date:** 2025-11-22 **Scope:** Complete frontend validation - all pages, routes, buttons, charts, data flows |
| [`docs/markdown_archive/20251122_090758/HF_DATA_ENGINE_INTEGRATION.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/HF_DATA_ENGINE_INTEGRATION.md) | HuggingFace Data Engine Integration | This document describes the integration of the HuggingFace Data Engine as the primary data source for the Dreammaker Cry |
| [`docs/markdown_archive/20251122_090758/HUGGINGFACE_DEPLOYMENT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/HUGGINGFACE_DEPLOYMENT.md) | 🚀 راهنمای استقرار در Hugging Face Spaces | [فارسی](#راهنمای-فارسی) \| [English](#english-guide) --- |
| [`docs/markdown_archive/20251122_090758/HUGGINGFACE_ONLINE_MODE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/HUGGINGFACE_ONLINE_MODE.md) | راهنمای فعال‌سازی حالت واقعی (ONLINE) در Hugging Face Spaces | - ✅ داده‌های نمونه و Mock - ✅ بدون نیاز به API Key |
| [`docs/markdown_archive/20251122_090758/HUGGINGFACE_SPACE_REQUIREMENTS.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/HUGGINGFACE_SPACE_REQUIREMENTS.md) | HuggingFace Data Engine - Enhancement Requirements | This document outlines requirements for enhancing the **HuggingFace Cryptocurrency Data Engine** (Space: `Really-amin/Da |
| [`docs/markdown_archive/20251122_090758/IMPLEMENTATION_NOTES.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/IMPLEMENTATION_NOTES.md) | Implementation Notes - Audit Recommendations | **Date:** 2025-11-14 **Branch:** `claude/implement-audit-recommendations-01PCsYAhSVTUmj6jYhwm1rFB` |
| [`docs/markdown_archive/20251122_090758/IMPLEMENTATION_PROMPT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/IMPLEMENTATION_PROMPT.md) | Implementation Prompt: Fix Data Providers & Enable Live Sign | The Dreammaker Crypto Signal & Trader application is fully operational (backend on port 8001, frontend on port 5173) but |
| [`docs/markdown_archive/20251122_090758/IMPLEMENTATION_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/IMPLEMENTATION_SUMMARY.md) | Implementation Summary - Production Readiness Initiative | **Date:** 2025-11-16   **Objective:** Transform architectural analysis into concrete, production-ready deliverables |
| [`docs/markdown_archive/20251122_090758/IMPROVEMENTS_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/IMPROVEMENTS_SUMMARY.md) | 🎯 خلاصه بهبودها و تغییرات | --- **فایل‌های جدید:** |
| [`docs/markdown_archive/20251122_090758/integrations/lastchance/adapters/README_integration.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/integrations/lastchance/adapters/README_integration.md) | LastChance Minimal API Bundle — Integration Guide (Minimal D | This bundle contains a curated set of **real-data** backend snippets (FastAPI) and small **client adapters** you can dro |
| [`docs/markdown_archive/20251122_090758/INTERACTION_VALIDATION_MAP.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/INTERACTION_VALIDATION_MAP.md) | Frontend Interaction Validation Map | **Comprehensive UI Element Testing Report** --- |
| [`docs/markdown_archive/20251122_090758/LIVE_INTEGRATION_TEST_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/LIVE_INTEGRATION_TEST_REPORT.md) | 🔗 LIVE INTEGRATION TEST REPORT | **Test Date:** 2025-11-22   **Backend URL:** http://localhost:8001 |
| [`docs/markdown_archive/20251122_090758/MERGE_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/MERGE_SUMMARY.md) | Merge Summary: API Versioning and Backend Route Verification | - **Source Branch:** `claude/verify-backend-paths-011CUy2yiFoWh613KemKaJij` - **Target Branch:** `main` |
| [`docs/markdown_archive/20251122_090758/ML_TRAINING_SETUP.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/ML_TRAINING_SETUP.md) | ML Training & Backtesting Setup | **Real AI Training Pipeline with Hugging Face Datasets & Walk-Forward Optimization** This implementation adds a producti |
| [`docs/markdown_archive/20251122_090758/NAVIGATION_AND_UI_AUDIT_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/NAVIGATION_AND_UI_AUDIT_REPORT.md) | Navigation and UI Audit Report | **Date:** 2025-11-16   **Project:** DreammakerCryptoSignalAndTrader |
| [`docs/markdown_archive/20251122_090758/NEXT_PHASE_PROMPT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/NEXT_PHASE_PROMPT.md) | 🚀 Next Phase: Performance, Monitoring & Advanced UI Feature | **Branch:** `claude/ui-error-states-retry-01WpBj7rQsRyB3m8VujSFfGw` **Current Phase:** UI Error States & Retry Logic ✅  |
| [`docs/markdown_archive/20251122_090758/OFFLINE_CASCADE_README.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/OFFLINE_CASCADE_README.md) | Never-Stall Data Cascade + One-Click 15m Test | This update adds a resilient data cascade system that ensures trading signals can be generated even when network is unav |
| [`docs/markdown_archive/20251122_090758/OPTIMIZATION_GUIDE_FA.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/OPTIMIZATION_GUIDE_FA.md) | راهنمای بهینه‌سازی استفاده از API های رایگان | این پروژه از چندین API رایگان استفاده می‌کند که محدودیت تعداد درخواست دارند. برای جلوگیری از مسدود شدن و استفاده بهینه ا |
| [`docs/markdown_archive/20251122_090758/patches/views-ui-improvements.patch.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/patches/views-ui-improvements.patch.md) | Views UI Improvements Patch | این patch شامل اصلاحات UI/UX برای همه view های نیازمند بهبود است. ✅ رفع conflict در error variable |
| [`docs/markdown_archive/20251122_090758/PERFORMANCE_MONITORING.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/PERFORMANCE_MONITORING.md) | Performance Monitoring & UX Enhancements | This document describes the performance monitoring, caching, and UX enhancements added to the Dreammaker Legal Agent app |
| [`docs/markdown_archive/20251122_090758/PLAYWRIGHT_FIX_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/PLAYWRIGHT_FIX_SUMMARY.md) | خلاصه رفع مشکل Playwright - خطای EACCES | خطای `connect EACCES ::1:xxxxx` در فایل `playwright.config.ts` این خطا به دلیل مشکلات اتصال شبکه در ویندوز رخ می‌دهد که |
| [`docs/markdown_archive/20251122_090758/PORT_MIGRATION_COMPLETE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/PORT_MIGRATION_COMPLETE.md) | PORT MIGRATION: 3001 → 8001 - COMPLETE RCA SOLUTION | The frontend issued requests to `http://localhost:3001` and `ws://localhost:3001`, while the backend runs on port **8001 |
| [`docs/markdown_archive/20251122_090758/PR_DESCRIPTION.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/PR_DESCRIPTION.md) | Fix: JSX Build Errors - Application Now Fully Operational | This PR resolves all critical JSX syntax errors that prevented the frontend from compiling. The application now builds a |
| [`docs/markdown_archive/20251122_090758/PRODUCTION_READINESS_CHECKLIST.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/PRODUCTION_READINESS_CHECKLIST.md) | Production Readiness Checklist v1.0 | **DreammakerCryptoSignalAndTrader**   Generated: 2025-11-16 |
| [`docs/markdown_archive/20251122_090758/PROXY_AND_DATA_FIXES.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/PROXY_AND_DATA_FIXES.md) | 🔧 گزارش کامل اصلاحات پروکسی و دریافت داده‌ها | تاریخ: 2025-11-11 نسخه: 2.0 |
| [`docs/markdown_archive/20251122_090758/QUICK_START_API_TESTING.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/QUICK_START_API_TESTING.md) | 🚀 شروع سریع - ماژول تست API | ```bash npm install |
| [`docs/markdown_archive/20251122_090758/QUICK_START_CHECKLIST.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/QUICK_START_CHECKLIST.md) | Quick Start - Production Checklist | 📄 **`docs/production_checklist.v1.json`** (7.3 KB) - Complete task breakdown with IDs, status, priorities |
| [`docs/markdown_archive/20251122_090758/QUICK_TEST_GUIDE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/QUICK_TEST_GUIDE.md) | 🚀 Quick Test Guide - Data Fetch & WebSocket Fixes | **After applying fixes, follow this quick test guide to verify everything works.** --- |
| [`docs/markdown_archive/20251122_090758/QUICK_TEST_VALIDATION.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/QUICK_TEST_VALIDATION.md) | ⚡ QUICK TEST & VALIDATION GUIDE | **Purpose**: Rapidly verify all fixes are working correctly   **Time Required**: 5-10 minutes |
| [`docs/markdown_archive/20251122_090758/READ_ME_FIRST.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/READ_ME_FIRST.md) | 🎉 پروژه شما آماده است! | تمام داده‌های Mock/Fake از پروژه حذف شده‌اند: - ❌ Math.random() ها حذف شدند |
| [`docs/markdown_archive/20251122_090758/README_FIXED.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/README_FIXED.md) | Dreammaker Crypto Trader - Fixed Version | 1. Fixed `.env` configuration (PORT 3001, Redis disabled) 2. Created `UnifiedProxyService` - handles all API calls with  |
| [`docs/markdown_archive/20251122_090758/README_FUTURES_ONLY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/README_FUTURES_ONLY.md) | Futures-Only Build Notice | **Build Version:** 1.0 (Futures-Only Release)   **Last Updated:** 2025-11-16 |
| [`docs/markdown_archive/20251122_090758/README_PRODUCTION.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/README_PRODUCTION.md) | Production Runbook | - Server: `ghcr.io/nimazasinich/dcs-server:<tag\|latest>` - Client: `ghcr.io/nimazasinich/dcs-client:<tag\|latest>` |
| [`docs/markdown_archive/20251122_090758/README_START.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/README_START.md) | 🚀 راهنمای سریع اجرای پروژه | ```powershell powershell -ExecutionPolicy Bypass -File start-all.ps1 |
| [`docs/markdown_archive/20251122_090758/README_WARMUP_CI.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/README_WARMUP_CI.md) | CI & Warmup Notes | - **CI** runs on every push/PR: typecheck, lint, build (client+server), unit tests. - **Nightly Warmup** builds, starts  |
| [`docs/markdown_archive/20251122_090758/REAL_DATA_IMPLEMENTATION.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/REAL_DATA_IMPLEMENTATION.md) | ✅ Real Market Data Implementation - COMPLETED | Your project is now **FULLY CONFIGURED** to fetch real cryptocurrency market data from multiple free sources. The 403 er |
| [`docs/markdown_archive/20251122_090758/REAL_DATA_SETUP.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/REAL_DATA_SETUP.md) | راهنمای استفاده از داده‌های واقعی | فایل `.env.local` با تنظیمات زیر ایجاد شده است: ```env |
| [`docs/markdown_archive/20251122_090758/RELEASE_READINESS_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/RELEASE_READINESS_REPORT.md) | RELEASE READINESS REPORT | **Project**: Crypto Trading Dashboard **Report Date**: 2025-11-14 |
| [`docs/markdown_archive/20251122_090758/RELEASE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/RELEASE.md) | Release Guide | This guide covers the complete release workflow for DreammakerCryptoSignalAndTrader, from local testing to production de |
| [`docs/markdown_archive/20251122_090758/reports/diagnostic/APP_RUNTIME_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/reports/diagnostic/APP_RUNTIME_REPORT.md) | Application Runtime Audit Report | **Project:** DreammakerCryptoSignalAndTrader **Audit Date:** 2025-11-07 |
| [`docs/markdown_archive/20251122_090758/REQUEST_STORM_FIX_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/REQUEST_STORM_FIX_REPORT.md) | 🛑 Request Storm Fix - Engineering Report | **Issue:** App startup triggered ~16+ HTTP requests + 1 WebSocket connection, causing free-tier API rate limit exhaustio |
| [`docs/markdown_archive/20251122_090758/REQUEST_STORM_FIX_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/REQUEST_STORM_FIX_SUMMARY.md) | 🎯 Request Storm Fix - Quick Summary | **Problem:** App sent ~16 HTTP requests on startup → hit free-tier rate limits   **Solution:** Reduced to ~8 requests ( |
| [`docs/markdown_archive/20251122_090758/ROOT_CAUSE_ANALYSIS.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/ROOT_CAUSE_ANALYSIS.md) | 🔍 ROOT CAUSE ANALYSIS - Realtime Data Sync & WebSocket Issu | **Date**: 2025-11-16   **System**: Trading Dashboard (Express.js + React + TypeScript) |
| [`docs/markdown_archive/20251122_090758/RUNTIME_HARDENING_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/RUNTIME_HARDENING_SUMMARY.md) | Runtime Hardening Summary | **Date:** 2025-11-16   **Mission:** Move from "architecture ready" to "runtime hardened and testable for production" |
| [`docs/markdown_archive/20251122_090758/RUNTIME_QA_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/RUNTIME_QA_REPORT.md) | Runtime / E2E Test QA Report | **Test Date:** 2025-11-14 **Branch:** `claude/runtime-e2e-test-qa-019vzcSrqowy2ioBmTXommi4` |
| [`docs/markdown_archive/20251122_090758/scripts/README-ADDITIVE-MERGE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/scripts/README-ADDITIVE-MERGE.md) | راهنمای Additive Merge و جلوگیری از Overwrite | این مستندات توضیح می‌دهد چطور **بدون حذف یا overwrite کردن** فایل‌های موجود، تغییرات را به صورت افزوده (additive) اعمال  |
| [`docs/markdown_archive/20251122_090758/SETUP_AND_TESTING_GUIDE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/SETUP_AND_TESTING_GUIDE.md) | 🚀 Complete Setup and Testing Guide | This guide provides step-by-step instructions to complete the setup and test all upgraded detectors with real data. --- |
| [`docs/markdown_archive/20251122_090758/SETUP_ONLINE_MODE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/SETUP_ONLINE_MODE.md) | 🚀 راهنمای سریع: فعال‌سازی حالت ONLINE (واقعی) | **چرا؟** قیمت‌های واقعی crypto 1. برو به: https://coinmarketcap.com/api/ |
| [`docs/markdown_archive/20251122_090758/setup-github-pages.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/setup-github-pages.md) | راهنمای فعال‌سازی GitHub Pages | 1. به آدرس زیر بروید:    ``` |
| [`docs/markdown_archive/20251122_090758/src/components/TopSignalsPanel.README.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/src/components/TopSignalsPanel.README.md) | TopSignalsPanel Component | کامپوننت TopSignalsPanel یک پنل مدرن و حرفه‌ای برای نمایش 3 سیگنال برتر AI است که در زیر چارت قیمت قرار می‌گیرد. کامپونن |
| [`docs/markdown_archive/20251122_090758/START_GUIDE_FA.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/START_GUIDE_FA.md) | 🚀 راهنمای سریع شروع کار | تنظیمات برای استفاده از **داده‌های واقعی** با بهینه‌سازی مصرف API: ``` |
| [`docs/markdown_archive/20251122_090758/STRATEGY_DASHBOARD_FEATURES.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/STRATEGY_DASHBOARD_FEATURES.md) | Interactive Strategy Dashboard with Real-Time Animation | This update introduces a fully interactive strategy dashboard with real-time animation and live feedback. Users can now  |
| [`docs/markdown_archive/20251122_090758/TASK_12_FINAL_UI_VERIFICATION_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/TASK_12_FINAL_UI_VERIFICATION_REPORT.md) | 🧪 TASK 12 – FULL UI FUNCTIONAL VERIFICATION & BUGFIX REPORT | **Project:** Dreammaker Crypto Trading Platform (HTS + Spot/Futures)   **Date:** 2025-11-16 |
| [`docs/markdown_archive/20251122_090758/TEST_PLAN.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/TEST_PLAN.md) | UI Error States & Retry Logic - Comprehensive Test Plan | This document provides a comprehensive test plan for validating the UI error states and retry functionality implemented  |
| [`docs/markdown_archive/20251122_090758/TESTING_CHECKLIST.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/TESTING_CHECKLIST.md) | 🧪 Testing Checklist - UI Error States & Retry Logic | **Branch:** `claude/ui-error-states-retry-01WpBj7rQsRyB3m8VujSFfGw` **Date:** 2025-11-14 |
| [`docs/markdown_archive/20251122_090758/TESTING_MODULE_READY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/TESTING_MODULE_READY.md) | ✅ ماژول تست API - آماده و ذخیره شده | ✅ `src/testing/api-test-framework.ts` ✅ `src/testing/request-validator.ts` |
| [`docs/markdown_archive/20251122_090758/TRADING_HUB_QUICKSTART.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/TRADING_HUB_QUICKSTART.md) | 🚀 Trading Hub - Quick Start Guide | A unified **Trading Hub** that combines three powerful trading features into one beautiful interface: 1. **Live Futures |
| [`docs/markdown_archive/20251122_090758/TRUTH_AUDIT_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/TRUTH_AUDIT_REPORT.md) | 🔍 TRUTH AUDIT REPORT | **Date:** 2025-11-22   **Role:** Senior Backend/AI Engineer & Quality Assurance Lead |
| [`docs/markdown_archive/20251122_090758/UI_GRACEFUL_DEGRADATION_FIX.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/UI_GRACEFUL_DEGRADATION_FIX.md) | 🎨 UI Graceful Degradation Fix | برخی صفحات UI زمانی که endpoint ها داده برنمی‌گردانند یا خطا می‌دهند، کاملاً غیرفعال می‌شدند یا پیام خطا نمایش می‌دادند  |
| [`docs/markdown_archive/20251122_090758/UI_NULL_GUARD_FIXES_COMPLETE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/UI_NULL_GUARD_FIXES_COMPLETE.md) | UI Null-Guard Fixes - Complete Report | **Date:** 2025-11-16   **Branch:** `cursor/fix-ui-view-null-guard-issues-3cd3` |
| [`docs/markdown_archive/20251122_090758/UI_NULL_GUARD_FIXES_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/UI_NULL_GUARD_FIXES_REPORT.md) | UI Null-Guard Fixes Report | **Date:** 2025-11-16   **Branch:** `cursor/fix-ui-view-null-guard-issues-3cd3` |
| [`docs/markdown_archive/20251122_090758/UI_REVIEW_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/UI_REVIEW_REPORT.md) | UI/UX Quality Review Report | **Branch:** `claude/ui-ux-quality-review-polish-01UPavdR9uJjsQnrf8JAdyvz` **Review Date:** 2025-11-14 |
| [`docs/markdown_archive/20251122_090758/VALIDATION_COMPLETE_SUMMARY.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/VALIDATION_COMPLETE_SUMMARY.md) | ✅ Frontend Functional Validation - COMPLETE SUMMARY | **Validation Date:** 2025-11-22   **Validation Scope:** Complete Frontend Exhaustive Validation |
| [`docs/markdown_archive/20251122_090758/VERIFICATION_COMPLETE.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/VERIFICATION_COMPLETE.md) | ✅ FINAL VERIFICATION COMPLETE | **Date:** 2025-11-16   **Status:** ✅ **COMPLETE** - 2 Critical Fixes Applied |
| [`docs/markdown_archive/20251122_090758/VIEWS_COMPREHENSIVE_AUDIT_REPORT.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/VIEWS_COMPREHENSIVE_AUDIT_REPORT.md) | 📊 Views Comprehensive Audit Report | **تاریخ:** 2025-11-10   **تعداد فایل‌های بررسی شده:** 21 View |
| [`docs/markdown_archive/20251122_090758/خلاصه_اصلاحات_نهایی.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/خلاصه_اصلاحات_نهایی.md) | خلاصه اصلاحات نهایی | **مشکل**: `Access-Control-Allow-Origin` با wildcard `*` و `credentials: include` سازگار نیست **راه‌حل**: |
| [`docs/markdown_archive/20251122_090758/خلاصه_بررسی_نهایی.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/خلاصه_بررسی_نهایی.md) | 📋 خلاصه بررسی نهایی و اصلاحات (Final Verification Summary) | **تاریخ:** ۱۴۰۴/۰۸/۲۶ (2025-11-16) **شاخه:** `cursor/final-verification-and-self-correction-prompt-91d9` |
| [`docs/markdown_archive/20251122_090758/خلاصه_تغییرات - Copy.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/خلاصه_تغییرات - Copy.md) | خلاصه تغییرات و راه‌اندازی پروژه | - **فایل**: `src/config/env.ts` - **تغییرات**: |
| [`docs/markdown_archive/20251122_090758/خلاصه_تغییرات.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/خلاصه_تغییرات.md) | خلاصه تغییرات و راه‌اندازی پروژه | - **فایل**: `src/config/env.ts` - **تغییرات**: |
| [`docs/markdown_archive/20251122_090758/خلاصه_نهایی_راه_حل - Copy.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/خلاصه_نهایی_راه_حل - Copy.md) | ✅ خلاصه نهایی راه‌حل | ``` ❌ WebSocket connection to 'ws://localhost:3001/ws/ws' failed |
| [`docs/markdown_archive/20251122_090758/خلاصه_نهایی_راه_حل.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/خلاصه_نهایی_راه_حل.md) | ✅ خلاصه نهایی راه‌حل | ``` ❌ WebSocket connection to 'ws://localhost:3001/ws/ws' failed |
| [`docs/markdown_archive/20251122_090758/دستورات_تست_نهایی.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/دستورات_تست_نهایی.md) | دستورات تست نهایی | - ✅ سرور در حال اجرا است (Process ID: 9868) - ✅ پورت 3001 در حالت LISTENING |
| [`docs/markdown_archive/20251122_090758/دستورالعمل_Restart_Frontend.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/دستورالعمل_Restart_Frontend.md) | دستورالعمل Restart Frontend | WebSocket هنوز به `/ws/ws` متصل می‌شود به جای `/ws` - ✅ `.env.local`: `VITE_WS_BASE=ws://localhost:3001` (بدون `/ws`) |
| [`docs/markdown_archive/20251122_090758/راهنمای_راه_اندازی_سرور.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/راهنمای_راه_اندازی_سرور.md) | راهنمای راه‌اندازی سرور WebSocket | سرور WebSocket در حال اجرا نیست، به همین دلیل قابلیت‌های real-time پروژه کار نمی‌کنند. این دستور هم سرور و هم کلاینت را |
| [`docs/markdown_archive/20251122_090758/راهنمای_رفع_مشکلات.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/راهنمای_رفع_مشکلات.md) | راهنمای رفع مشکلات | **خطا**: `ws://localhost:3001/ws/ws` **راه‌حل**: اصلاح `src/config/env.ts` برای برگرداندن base URL بدون `/ws` |
| [`docs/markdown_archive/20251122_090758/راهنمای_کنترل_منابع.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/راهنمای_کنترل_منابع.md) | 🎯 راهنمای کامل کنترل منابع و جلوگیری از درخواست‌های بی‌رویه | **قبل از اصلاح:** ``` |
| [`docs/markdown_archive/20251122_090758/گزارش_کامل_اصلاحات_۱۱_نوامبر.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/گزارش_کامل_اصلاحات_۱۱_نوامبر.md) | 🎉 گزارش کامل اصلاحات - ۱۱ نوامبر ۲۰۲۵ | **تاریخ:** ۱۱ نوامبر ۲۰۲۵   **نسخه:** ۲.۰ |
| [`docs/markdown_archive/20251122_090758/گزارش_نهایی_اصلاحات - Copy.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/گزارش_نهایی_اصلاحات - Copy.md) | 🎉 گزارش نهایی اصلاحات | **قبل:** ``` |
| [`docs/markdown_archive/20251122_090758/گزارش_نهایی_اصلاحات.md`](./docs/markdown_archive/20251122_090758/docs/markdown_archive/20251122_090758/گزارش_نهایی_اصلاحات.md) | 🎉 گزارش نهایی اصلاحات | **قبل:** ``` |

</details>

### 🔄 How to Restore Archived Files

To restore any archived markdown file back to its original location:

```bash
# Restore a specific file
git mv "docs/markdown_archive/20251122_090758/<original-path>" "<original-path>"

# Example: Restore a guide to root
git mv "docs/markdown_archive/20251122_090758/QUICK_START_GUIDE.md" "./QUICK_START_GUIDE.md"
```

**Archive Metadata:**
- **Index File:** [`docs/markdown_archive/20251122_090758/index.json`](./docs/markdown_archive/20251122_090758/index.json)
- **Total Documents:** 220
- **Archive Branch:** `cursor/archive-markdown-20251122_090758`
- **Backup Files:** All moved files have timestamped backups with `.bak-20251122_090758` suffix

## Acknowledgments

Built with modern web technologies and best practices for cryptocurrency trading automation.