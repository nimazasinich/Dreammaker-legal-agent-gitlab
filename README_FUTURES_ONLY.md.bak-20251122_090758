# Futures-Only Build Notice

**Build Version:** 1.0 (Futures-Only Release)  
**Last Updated:** 2025-11-16

---

## 🎯 What This Build Provides

This is a **Futures-only release** of DreammakerCryptoSignalAndTrader. SPOT trading is **not implemented** in this build.

### ✅ Fully Operational Features

1. **Futures Trading (KuCoin Testnet)**
   - Real API integration with KuCoin Futures testnet
   - Place market and limit orders
   - Long and short positions
   - Leverage up to 100x (testnet)
   - Real-time position management

2. **Real-Time Data**
   - Live market prices via HF Data Engine
   - WebSocket updates for positions and orders
   - Real-time funding rates
   - Live P&L tracking

3. **Technical Analysis & Signals**
   - 11+ proprietary detectors (SMC, Elliott, Harmonics, etc.)
   - Multi-layer strategy scoring (Strategy 1/2/3)
   - Real-time signal generation
   - Market scanner with signal alerts

4. **Risk Management**
   - Position size limits
   - Leverage limits
   - Maximum drawdown protection
   - Risk score calculation per trade

5. **Strategy Builder**
   - Configurable strategy weights
   - Multiple technical indicators
   - Backtesting engine
   - Performance analytics

---

## 🚫 What's NOT in This Build

### SPOT Trading
**Status:** Not implemented  
**Reason:** Prioritizing Futures trading for initial release

**What this means:**
- No SPOT order placement
- No SPOT balance display
- No SPOT position management

**Will SPOT be added?**  
SPOT trading is planned for a future release. The architecture is prepared, but KuCoin SPOT testnet API integration is incomplete.

**Alternative:**  
Use Futures trading with 1x leverage if you want unleveraged trades (this effectively mimics SPOT behavior).

---

## 🔧 Quick Start (Futures-Only)

### 1. Set Up KuCoin Futures Testnet

1. Create a KuCoin testnet account: https://sandbox-futures.kucoin.com/
2. Generate API keys with **Futures Trading** permission
3. **IMPORTANT:** Disable withdraw and transfer permissions

### 2. Configure Environment

Create `.env.local`:

```bash
# Trading Configuration
VITE_TRADING_MODE=TESTNET
VITE_APP_MODE=online

# Data Integrity
VITE_STRICT_REAL_DATA=true
VITE_USE_MOCK_DATA=false
VITE_ALLOW_FAKE_DATA=false

# KuCoin Futures Testnet
VITE_KUCOIN_API_KEY=your_testnet_api_key
VITE_KUCOIN_API_SECRET=your_testnet_api_secret
VITE_KUCOIN_API_PASSPHRASE=your_testnet_passphrase
VITE_KUCOIN_TESTNET=true

# HF Data Engine
VITE_HF_ENGINE_URL=https://your-hf-engine.com
VITE_HF_ENGINE_API_KEY=your_hf_api_key
```

### 3. Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or start production build
npm run build
npm run preview
```

### 4. Access Trading Interface

1. Open browser: http://localhost:5173
2. Navigate to **Trading** section
3. You'll see **Futures Trading Platform** (no SPOT/Futures tabs)
4. Select a symbol and start trading on testnet

---

## 📋 Configuration Reference

### Trading Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `OFF` | No trading (view-only) | Testing UI |
| `DRY_RUN` | Simulated trades (no API calls) | Strategy testing |
| `TESTNET` | Real KuCoin testnet API | Safe live testing |
| `LIVE` | Real production API | **NOT RECOMMENDED** yet |

**Recommendation:** Start with `TESTNET` mode.

### System Configuration

Located in `config/system.config.json`:

```json
{
  "features": {
    "liveScoring": true,
    "backtest": true,
    "autoTuning": false,
    "autoTrade": false,
    "manualTrade": true
  },
  "modes": {
    "environment": "DEV",
    "trading": "DRY_RUN"
  },
  "trading": {
    "environment": "DEV",
    "mode": "DRY_RUN",
    "market": "FUTURES"  // ✅ Futures-only
  }
}
```

**Key Setting:** `"market": "FUTURES"` enforces Futures-only mode.

---

## 🛡️ Safety Features

Even in this Futures-only build, safety is paramount:

1. **Testnet First**
   - All testing happens on KuCoin testnet
   - No real money at risk during development

2. **Risk Guards**
   - Position size limits enforced
   - Maximum leverage checks
   - Balance verification before orders

3. **No Fake Data**
   - `STRICT_REAL_DATA=true` blocks synthetic data
   - `ALLOW_FAKE_DATA=false` prevents fake fills
   - Only real exchange data used

4. **Trading Mode Control**
   - Easy switch between OFF, DRY_RUN, TESTNET
   - Clear UI indicators of current mode
   - Manual confirmation for dangerous actions

---

## 📊 Trading Workflow

### 1. Analysis
- View real-time market data
- Check technical indicators (SMC, Elliott, etc.)
- Review generated signals in Scanner

### 2. Strategy Selection
- Choose from Strategy 1/2/3 tiers
- Review risk score and confidence level
- Check entry/exit levels

### 3. Order Placement
- Select symbol (e.g., BTCUSDT)
- Choose side (Long/Short)
- Set leverage (1x to 100x on testnet)
- Set order type (Market/Limit)
- Add stop-loss and take-profit (optional)
- **Place Order** → Executes on KuCoin testnet

### 4. Position Management
- View open positions in real-time
- Monitor P&L updates via WebSocket
- Adjust stop-loss/take-profit
- Close position manually or wait for TP/SL

### 5. Performance Tracking
- Review closed positions
- Analyze win rate and profit factor
- Adjust strategy based on results

---

## 🔍 Troubleshooting

### "Order rejected: Insufficient balance"
**Solution:** Fund your KuCoin Futures testnet account. Testnet funds are free: https://sandbox-futures.kucoin.com/

### "WebSocket connection failed"
**Solution:** Check if KuCoin testnet is accessible. Verify firewall settings.

### "No market data available"
**Solution:**
1. Verify HF Engine URL is correct and accessible
2. Check if `VITE_HF_ENGINE_URL` is set in `.env.local`
3. Verify HF Engine is running

### "SPOT trading not available" message
**This is expected.** This is a Futures-only build. No action needed.

---

## 📚 Documentation

For more details, see:

- [Production Readiness Checklist](./PRODUCTION_READINESS_CHECKLIST.md) - Why Futures-only
- [Data Flow](./docs/data-flow.md) - How data moves through the system
- [Routes Inventory](./docs/routes.md) - Available API endpoints
- [Production Env Config](./docs/production-env-config.md) - Full env var reference
- [HF Engine Scope](./docs/hf-engine-scope.md) - What HF Engine provides

---

## 🚀 Next Steps After Testing

Once you've successfully traded on testnet:

1. **Expand Strategy Coverage**
   - Add more symbols
   - Fine-tune indicator weights in `scoring.config.json`
   - Backtest with more historical data

2. **Enhance Risk Management**
   - Implement portfolio-level risk limits
   - Add correlation-based position sizing
   - Set up automated stop-loss trailing

3. **Consider SPOT Integration** (Future Release)
   - Implement KuCoin SPOT testnet API
   - Add SPOT balance management
   - Create unified SPOT/Futures interface

4. **Production Deployment** (Only After Extensive Testing)
   - Switch to `VITE_TRADING_MODE=LIVE`
   - Use production API keys (with withdraw disabled)
   - Enable monitoring and alerts
   - **Start with small position sizes**

---

## ⚠️ Important Reminders

1. **This is testnet.** Practice with fake funds before considering real money.
2. **Futures are leveraged.** Losses can exceed your initial investment.
3. **Always use stop-losses.** Limit your downside risk.
4. **Test thoroughly.** Don't rush to production.
5. **SPOT is not available.** This build is Futures-only.

---

## 📞 Support

If you encounter issues:

1. Check the [Troubleshooting](#-troubleshooting) section above
2. Review logs in browser console (F12)
3. Check server logs for backend errors
4. Verify environment configuration
5. Review KuCoin testnet API documentation: https://docs.kucoin.com/futures/

---

**Built with:** React, TypeScript, Express, KuCoin Futures API, HF Data Engine  
**License:** See LICENSE file  
**Version:** 1.0.0-futures-only
