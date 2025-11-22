# Production Environment Configuration

**Last Updated:** 2025-11-16  
**Purpose:** Define required environment variables for production deployment

This document ensures **data integrity** and **trading safety** in production environments.

---

## 🔴 Critical Production Variables (MUST SET)

These variables **must** be set correctly for any production or testnet deployment where real trading occurs:

```bash
# Application Mode
VITE_APP_MODE=online

# Data Integrity (prevent fake/mock data)
VITE_STRICT_REAL_DATA=true
VITE_USE_MOCK_DATA=false
VITE_ALLOW_FAKE_DATA=false

# Trading Mode (start with testnet)
VITE_TRADING_MODE=TESTNET

# API Keys (KuCoin Futures Testnet)
VITE_KUCOIN_API_KEY=your_testnet_api_key
VITE_KUCOIN_API_SECRET=your_testnet_api_secret
VITE_KUCOIN_API_PASSPHRASE=your_testnet_passphrase
VITE_KUCOIN_TESTNET=true

# HF Data Engine
VITE_HF_ENGINE_URL=https://your-hf-engine.com
VITE_HF_ENGINE_API_KEY=your_hf_api_key
```

---

## 📋 Complete Variable Reference

### Application Mode

#### `VITE_APP_MODE`
**Values:** `online` | `offline` | `demo`  
**Production:** `online`  
**Description:** Determines overall application behavior

- `online`: Use real API data, allow trading
- `offline`: Use cached/local data only (not implemented yet)
- `demo`: Use limited demo data (no trading)

**Default:** `demo`

---

### Data Policy

#### `VITE_STRICT_REAL_DATA`
**Values:** `true` | `false`  
**Production:** `true`  
**Description:** When `true`, blocks any synthetic or mock data from being used

**Impact:**
- Rejects data from mock providers
- Blocks synthetic fills/orders
- Enforces real API responses only

**Default:** `false`

---

#### `VITE_USE_MOCK_DATA`
**Values:** `true` | `false`  
**Production:** `false`  
**Description:** When `true`, allows mock data providers

**Impact:**
- Enables `MockBinanceProvider`, `MockKuCoinProvider`, etc.
- Should ONLY be `true` in development

**Default:** `false`

---

#### `VITE_ALLOW_FAKE_DATA`
**Values:** `true` | `false`  
**Production:** `false`  
**Description:** When `true`, allows fake order fills and synthetic trades

**Impact:**
- Enables "pretend" order execution without exchange confirmation
- NEVER set to `true` in production or testnet

**Default:** `false`

---

### Trading Configuration

#### `VITE_TRADING_MODE`
**Values:** `OFF` | `DRY_RUN` | `TESTNET` | `LIVE`  
**Production (testnet):** `TESTNET`  
**Production (live):** `LIVE` (not recommended until fully tested)  
**Description:** Controls trading execution behavior

**Modes:**
- `OFF`: No trading allowed (view-only)
- `DRY_RUN`: Simulated trades (no exchange API calls)
- `TESTNET`: Real API calls to testnet (KuCoin testnet)
- `LIVE`: Real API calls to production exchange (use with extreme caution)

**Default:** `DRY_RUN`

---

#### `VITE_KUCOIN_API_KEY`
**Type:** String  
**Required:** Yes (for trading)  
**Description:** KuCoin API key (testnet or production)

**Security:**
- NEVER commit to Git
- Use environment-specific secrets management
- Rotate regularly

---

#### `VITE_KUCOIN_API_SECRET`
**Type:** String  
**Required:** Yes (for trading)  
**Description:** KuCoin API secret (testnet or production)

**Security:**
- NEVER commit to Git
- Must match API key
- Rotate with API key

---

#### `VITE_KUCOIN_API_PASSPHRASE`
**Type:** String  
**Required:** Yes (for trading)  
**Description:** KuCoin API passphrase (set when creating API key)

**Security:**
- NEVER commit to Git
- Specific to each API key
- Cannot be recovered if lost (must create new key)

---

#### `VITE_KUCOIN_TESTNET`
**Values:** `true` | `false`  
**Production (testnet):** `true`  
**Production (live):** `false`  
**Description:** When `true`, uses KuCoin testnet endpoints

**Endpoints:**
- Testnet: `https://api-sandbox-futures.kucoin.com`
- Production: `https://api-futures.kucoin.com`

**Default:** `true`

---

### Data Sources

#### `VITE_HF_ENGINE_URL`
**Type:** URL  
**Required:** Yes (for online mode)  
**Description:** Base URL for HF (Hugging Face) Data Engine

**Example:** `https://hf-data-engine.your-domain.com`

**Default:** *(none, must be provided)*

---

#### `VITE_HF_ENGINE_API_KEY`
**Type:** String  
**Required:** Depends on HF Engine configuration  
**Description:** Authentication key for HF Engine API

**Security:**
- NEVER commit to Git
- May not be required if HF Engine is public

**Default:** *(none)*

---

#### `VITE_BINANCE_API_KEY`
**Type:** String  
**Required:** No (optional fallback)  
**Description:** Binance API key for fallback data

**Note:** Only used if HF Engine is unavailable

---

#### `VITE_COINMARKETCAP_API_KEY`
**Type:** String  
**Required:** No (optional fallback)  
**Description:** CoinMarketCap API key for market cap data

**Note:** Only used if HF Engine is unavailable

---

#### `VITE_CRYPTOCOMPARE_API_KEY`
**Type:** String  
**Required:** No (optional fallback)  
**Description:** CryptoCompare API key for historical data

**Note:** Only used if HF Engine is unavailable

---

### System Configuration

#### `VITE_LOG_LEVEL`
**Values:** `debug` | `info` | `warn` | `error`  
**Production:** `warn`  
**Description:** Logging verbosity

**Recommendation:**
- Development: `debug`
- Staging: `info`
- Production: `warn`

**Default:** `info`

---

#### `VITE_ENABLE_ANALYTICS`
**Values:** `true` | `false`  
**Production:** `true` (if analytics are set up)  
**Description:** Enable usage analytics and error tracking

**Default:** `false`

---

#### `VITE_AUTO_REFRESH_INTERVAL`
**Type:** Number (milliseconds)  
**Production:** `60000` (60 seconds)  
**Description:** Data auto-refresh interval

**Recommendation:**
- Development: `30000` (30s) or disabled
- Production: `60000` (60s)

**Default:** `0` (disabled)

---

## 🛡️ Security Best Practices

### 1. Never Commit Secrets
```bash
# .gitignore should include:
.env
.env.local
.env.production
*.env
```

### 2. Use Environment-Specific Files
```bash
# Development
.env.development

# Staging
.env.staging

# Production
.env.production
```

### 3. Use Secrets Management in Production
- **Vercel:** Use Vercel Secrets
- **Railway:** Use Railway Variables
- **Docker:** Use Docker Secrets or environment file injection
- **Kubernetes:** Use Kubernetes Secrets

### 4. Rotate API Keys Regularly
- KuCoin: Rotate every 90 days
- HF Engine: Rotate every 180 days
- Other providers: Per their security recommendations

### 5. Restrict API Key Permissions
KuCoin API key should have:
- ✅ Futures Trading: Enabled
- ✅ Read Account: Enabled
- 🚫 Withdraw: **DISABLED**
- 🚫 Transfer: **DISABLED**

---

## 📝 Sample Configuration Files

### Development (`.env.development`)
```bash
VITE_APP_MODE=demo
VITE_STRICT_REAL_DATA=false
VITE_USE_MOCK_DATA=true
VITE_ALLOW_FAKE_DATA=true
VITE_TRADING_MODE=DRY_RUN
VITE_LOG_LEVEL=debug
VITE_AUTO_REFRESH_INTERVAL=30000
```

### Testnet (`.env.testnet`)
```bash
VITE_APP_MODE=online
VITE_STRICT_REAL_DATA=true
VITE_USE_MOCK_DATA=false
VITE_ALLOW_FAKE_DATA=false
VITE_TRADING_MODE=TESTNET
VITE_LOG_LEVEL=info

VITE_KUCOIN_API_KEY=testnet_key_here
VITE_KUCOIN_API_SECRET=testnet_secret_here
VITE_KUCOIN_API_PASSPHRASE=testnet_passphrase_here
VITE_KUCOIN_TESTNET=true

VITE_HF_ENGINE_URL=https://hf-engine.your-domain.com
VITE_HF_ENGINE_API_KEY=your_hf_key_here

VITE_AUTO_REFRESH_INTERVAL=60000
```

### Production (`.env.production`)
```bash
VITE_APP_MODE=online
VITE_STRICT_REAL_DATA=true
VITE_USE_MOCK_DATA=false
VITE_ALLOW_FAKE_DATA=false
VITE_TRADING_MODE=TESTNET  # Or LIVE after extensive testing
VITE_LOG_LEVEL=warn
VITE_ENABLE_ANALYTICS=true

VITE_KUCOIN_API_KEY=<use_secrets_manager>
VITE_KUCOIN_API_SECRET=<use_secrets_manager>
VITE_KUCOIN_API_PASSPHRASE=<use_secrets_manager>
VITE_KUCOIN_TESTNET=false  # Or true for testnet

VITE_HF_ENGINE_URL=<use_secrets_manager>
VITE_HF_ENGINE_API_KEY=<use_secrets_manager>

VITE_AUTO_REFRESH_INTERVAL=60000
```

---

## ✅ Environment Validation Checklist

Before deploying, verify:

- [ ] All `VITE_*` variables are set correctly
- [ ] No secrets committed to Git
- [ ] `VITE_STRICT_REAL_DATA=true` in production
- [ ] `VITE_ALLOW_FAKE_DATA=false` in production
- [ ] `VITE_TRADING_MODE` matches intended deployment (TESTNET or LIVE)
- [ ] KuCoin API keys have correct permissions (withdraw/transfer disabled)
- [ ] HF Engine URL is reachable from deployment environment
- [ ] Log level is appropriate (`warn` for production)
- [ ] Analytics are enabled (if implemented)

---

## 🔍 Verifying Configuration at Runtime

### Check current configuration in browser console:
```javascript
console.log('App Mode:', import.meta.env.VITE_APP_MODE);
console.log('Trading Mode:', import.meta.env.VITE_TRADING_MODE);
console.log('Strict Real Data:', import.meta.env.VITE_STRICT_REAL_DATA);
console.log('Allow Fake Data:', import.meta.env.VITE_ALLOW_FAKE_DATA);
```

### Check configuration on server:
```bash
# View environment variables (BE CAREFUL, contains secrets!)
printenv | grep VITE_

# Or check a specific non-secret variable
echo $VITE_APP_MODE
```

---

## 📚 Related Documentation

- [Data Flow](./data-flow.md) - How data flows through the system
- [HF Engine Scope](./hf-engine-scope.md) - What HF Engine provides
- [Routes Inventory](./routes.md) - Active API routes

---

## ⚠️ Emergency: Suspect Compromised API Keys

If you suspect API keys are compromised:

1. **Immediately disable the API key** on KuCoin (or relevant exchange)
2. **Generate new API keys** with same permissions
3. **Update environment variables** in all deployments
4. **Rotate all related secrets** (passphrases, HF Engine keys, etc.)
5. **Audit recent trading activity** for unauthorized trades
6. **Review server logs** for unauthorized access

---

**Key Takeaway:** Production requires `STRICT_REAL_DATA=true`, `ALLOW_FAKE_DATA=false`, and careful API key management. Start with TESTNET mode before considering LIVE trading.
