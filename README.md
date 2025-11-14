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

## Acknowledgments

Built with modern web technologies and best practices for cryptocurrency trading automation.