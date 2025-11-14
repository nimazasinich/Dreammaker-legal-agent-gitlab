# Environment Setup and Running Guide

This guide explains how to set up and run the Dreammaker Crypto Trading Dashboard on your local machine.

---

## Prerequisites

### Required Software

- **Node.js:** `>= 18.0.0` (tested with v22.21.1)
- **npm:** `>= 9.0.0` (tested with v10.9.4)

**Check your versions:**
```bash
node --version
npm --version
```

### Optional Dependencies

The application uses embedded/in-process services:
- **SQLite** - Embedded database (no separate installation needed)
- **Redis** - Can be disabled via `DISABLE_REDIS=true` (optional for development)

---

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd Dreammaker-legal-agent-gitlab

# Install dependencies
npm install
```

**Expected output:** `650 packages audited, 0 vulnerabilities`

---

## Step 2: Configure Environment Variables

### Create `.env` File

Copy the template to create your environment configuration:

```bash
cp env .env
```

### Required Configuration

Open `.env` and configure the following sections:

#### A. Basic Server Configuration

These are already set in the template - verify they match your setup:

```env
# Server ports
PORT=3001                              # Backend API port
VITE_API_BASE=http://localhost:3001/api
VITE_WS_BASE=http://localhost:3001

# Environment
NODE_ENV=development

# Data mode (already configured for real data)
VITE_APP_MODE=online
VITE_STRICT_REAL_DATA=true
VITE_USE_MOCK_DATA=false
VITE_ALLOW_FAKE_DATA=false
```

**Note:** The default `PORT` is `3001`, but the application may auto-detect and use `8000` in some configurations. Check the startup logs.

#### B. KuCoin Futures TESTNET Keys (Required for Trading)

To test Futures trading functionality, you need KuCoin TESTNET API credentials:

1. **Create a KuCoin TESTNET account:**
   - Visit: https://www.kucoin.com/futures-testnet
   - Sign up and verify your account

2. **Generate API Keys:**
   - Go to API Management in TESTNET dashboard
   - Create new API key with **Futures** permission
   - Enable IP whitelist (recommended) or allow all IPs for testing
   - Save the Key, Secret, and Passphrase

3. **Add to `.env`:**

```env
# KuCoin Futures TESTNET (for trading features)
KUCOIN_FUTURES_KEY=your_testnet_api_key_here
KUCOIN_FUTURES_SECRET=your_testnet_api_secret_here
KUCOIN_FUTURES_PASSPHRASE=your_testnet_passphrase_here
```

**Without these keys:**
- ✅ Application will run normally
- ✅ UI will be accessible
- ⚠️ Trading features cannot be tested
- ⚠️ `/api/futures/*` endpoints will return errors

#### C. Market Data API Keys (Optional - for alternative providers)

If external APIs (Binance, KuCoin) are geo-blocked or rate-limited, configure alternative providers:

##### CoinGecko Pro (Recommended for Production)

```env
# CoinGecko Pro API (paid tier for higher rate limits)
COINGECKO_API_KEY=your_coingecko_pro_key_here
```

- Free tier: Limited to 10-30 calls/minute
- Pro tier: https://www.coingecko.com/en/api/pricing
- Used as fallback when Binance/KuCoin unavailable

##### CryptoCompare

```env
# CryptoCompare API (free tier available)
CRYPTOCOMPARE_API_KEY=your_cryptocompare_key_here
```

- Free tier: https://min-api.cryptocompare.com/pricing
- Used as additional fallback provider

#### D. Redis Configuration (Optional)

Redis is used for caching but can be disabled for local development:

```env
# Disable Redis (SQLite-only mode)
DISABLE_REDIS=true
```

**If you want to use Redis:**
```env
DISABLE_REDIS=false
REDIS_URL=redis://localhost:6379
```

Install and run Redis locally:
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis

# Windows
# Download from: https://github.com/microsoftarchive/redis/releases
```

#### E. Optional Features

Already configured in template, but you can adjust:

```env
# Startup behavior (reduce load on boot)
START_INGEST_ON_BOOT=false    # Don't auto-fetch data on startup
DISABLE_NEWS=true              # Skip news fetching
DISABLE_SENTIMENT=true         # Skip sentiment analysis

# Watched symbols (for minimal testing)
WATCHED_SYMBOLS=BTC,ETH

# CoinMarketCap (disabled - limited free tier)
ENABLE_CMC=false
CMC_API_KEY=
```

---

## Step 3: Run the Application

### Option A: Run Full Stack (Recommended)

Start both backend and frontend together:

```bash
npm run dev
```

**Expected output:**
```
> concurrently "npm run dev:server" "npm run dev:client"

[0] ✅ Server running on port 3001
[0] 🔍 Health check: http://localhost:3001/api/health
[1] VITE v7.2.2  ready in 300 ms
[1] ➜  Local:   http://localhost:5173/
```

### Option B: Run Backend and Frontend Separately

**Terminal 1 - Backend:**
```bash
npm run dev:server
```

Wait for: `✅ Server running on port 3001`

**Terminal 2 - Frontend:**
```bash
npm run dev:client
```

Wait for: `➜  Local:   http://localhost:5173/`

---

## Step 4: Access the Application

### Frontend (Main UI)

Open your browser to:
```
http://localhost:5173
```

**Available Routes:**
- `/` - Dashboard (overview)
- `/market` - Market data and prices
- `/scanner` - AI Signals, Patterns, Smart Money, Sentiment analysis
- `/trading` - Futures and SPOT trading (SPOT disabled, Futures requires API keys)
- `/portfolio` - Portfolio management and risk center
- `/settings` - Exchange API and notification settings

### Backend (API)

Health check:
```bash
curl http://localhost:3001/api/health
# or if auto-detected to port 8000:
curl http://localhost:8000/api/health
```

**Expected response:**
```json
{"status":"unhealthy","error":"Request failed with status code 403"}
```
or
```json
{"ok":true,"ts":...,"service":"dreammaker-crypto-signal-trader"}
```

---

## Step 5: Troubleshooting

### Issue: Empty Market Data / No Prices

**Symptom:**
- Market view shows empty tables
- Signals cannot be generated
- "Insufficient market data" errors

**Cause:** External APIs (Binance, KuCoin) are geo-blocked (403 Forbidden)

**Solutions:**

#### Option 1: Use VPN
Connect to a VPN in a region where Binance/KuCoin APIs are accessible (e.g., US, EU, Singapore).

Restart the application:
```bash
npm run dev
```

#### Option 2: Configure Alternative Providers
Add API keys to `.env`:
```env
COINGECKO_API_KEY=your_key_here
CRYPTOCOMPARE_API_KEY=your_key_here
```

Restart the application.

#### Option 3: Verify API Access
Check backend logs for error messages:
```
[ERROR] Binance API error | Context: {"status":403,"statusText":"Forbidden"...}
[WARN] ⚠️ CoinGecko returned empty array
```

If you see these errors, the application is working correctly but cannot reach external APIs from your network.

### Issue: Trading Features Not Working

**Symptom:**
- Futures trading buttons disabled
- Order placement fails

**Solution:**
1. Add KuCoin TESTNET API keys to `.env` (see Step 2B)
2. Restart the application
3. Verify keys are valid in KuCoin TESTNET dashboard

### Issue: Port Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution:**

**macOS/Linux:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use the helper script
npm run dev:kill
```

**Windows:**
```powershell
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process
taskkill /PID <PID> /F
```

### Issue: Frontend Build Errors

**Symptom:**
```
ERROR: Unexpected closing fragment tag...
```

**Solution:**
This should not occur on the `claude/fix-jsx-build-error-01A1tjQo1BCYNpGFshKi2qTr` branch or later, as all JSX errors are fixed.

If you see this, ensure you're on the correct branch:
```bash
git branch
git checkout claude/fix-jsx-build-error-01A1tjQo1BCYNpGFshKi2qTr
```

### Issue: Redis Connection Errors

**Symptom:**
```
[ERROR] Redis connection failed
```

**Solution:**
Either:
1. Install and start Redis (see Step 2D), OR
2. Disable Redis in `.env`:
   ```env
   DISABLE_REDIS=true
   ```

---

## Expected Behavior

### With Real API Access (VPN or alternative providers configured)

✅ **You should see:**
- Real-time price data in Market view
- AI signals generated in Scanner
- Order books and trade history
- Live WebSocket updates
- News and sentiment analysis

### Without Real API Access (default test environment)

✅ **You should see:**
- UI loads successfully
- All routes accessible and render correctly
- Empty states with friendly messages:
  - "No market data available"
  - "Insufficient data to generate signals"
  - "Add API keys to enable trading"
- No crashes or errors

⚠️ **This is expected behavior** - the application gracefully handles unavailable data sources.

---

## Production Deployment

For production deployment:

1. **Set environment to production:**
   ```env
   NODE_ENV=production
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Configure production API keys:**
   - Use KuCoin **PRODUCTION** keys (not TESTNET)
   - Add CoinGecko Pro / CryptoCompare keys
   - Enable Redis for production caching

4. **Start production server:**
   ```bash
   npm start
   ```

5. **Verify deployment:**
   - Check health endpoint returns `{"status":"healthy"}`
   - Verify market data is populated
   - Test trading functionality with small amounts

---

## Quick Reference

### Essential Commands

```bash
# Install dependencies
npm install

# Run full stack (recommended)
npm run dev

# Run backend only
npm run dev:server

# Run frontend only
npm run dev:client

# Build for production
npm run build

# Start production server
npm start

# Check health
curl http://localhost:3001/api/health
```

### Key Ports

- **Backend API:** `3001` (or auto-detected `8000`)
- **Frontend UI:** `5173`
- **Redis:** `6379` (if enabled)

### Important Files

- `.env` - Environment configuration (create from `env` template)
- `RUNTIME_QA_REPORT.md` - Runtime test results and verification
- `PR_DESCRIPTION.md` - Summary of JSX fixes and current status

---

## Support

If you encounter issues:

1. **Check logs:** Backend logs show detailed error messages
2. **Verify environment:** Ensure `.env` is configured correctly
3. **Check API access:** Use VPN if APIs are geo-blocked
4. **Review documentation:** See `RUNTIME_QA_REPORT.md` for known limitations

The application is designed to run successfully even without real market data access - all features are code-complete and functional when properly configured.
