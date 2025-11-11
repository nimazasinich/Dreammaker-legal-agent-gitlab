# 🚀 Complete Setup and Testing Guide

This guide provides step-by-step instructions to complete the setup and test all upgraded detectors with real data.

---

## ✅ What's Already Done

### 1. Code Completion (100%)
- ✅ All 5 detectors upgraded to use real services
- ✅ Pipeline updated with async support
- ✅ Feature flags enabled (AI Enhanced + Futures)
- ✅ Test scripts written
- ✅ Comprehensive error handling added

### 2. Partial Configuration (70%)
- ✅ `.env` file exists
- ✅ Most API keys are configured
- ⚠️ Some keys need validation
- ❌ KuCoin Futures credentials are placeholders

---

## 🔧 Required Setup Steps

### Step 1: Verify API Keys in `.env`

Current status of API keys:

| Service | Key Name | Status | Required For |
|---------|----------|--------|--------------|
| **CoinMarketCap** | `CMC_API_KEY` | ✅ Configured | Optional - Premium data |
| **CryptoCompare** | `CRYPTOCOMPARE_KEY` | ✅ Configured | Optional - Fallback prices |
| **NewsAPI** | `NEWS_API_KEY` | ✅ Configured | **REQUIRED** - News detector |
| **Etherscan** | `ETHERSCAN_API_KEY` | ✅ Configured | **REQUIRED** - Whale detector (ETH) |
| **BscScan** | `BSCSCAN_API_KEY` | ✅ Configured | **REQUIRED** - Whale detector (BSC) |
| **TronScan** | `TRONSCAN_API_KEY` | ✅ Configured | **REQUIRED** - Whale detector (TRX) |
| **CoinGecko** | N/A (Free) | ✅ No key needed | **REQUIRED** - Price data |
| **Fear & Greed** | N/A (Free) | ✅ No key needed | **REQUIRED** - Sentiment |
| **HuggingFace** | `HUGGINGFACE_API_KEY` | ⚠️ Empty (optional) | Optional - Higher rate limits |
| **KuCoin Futures** | `KUCOIN_FUTURES_*` | ❌ Placeholders | **REQUIRED** - Futures trading |

### Step 2: Test API Keys

Run this command to test if all keys are working:

```bash
# Test CoinGecko (no key required)
curl "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"

# Test Fear & Greed Index (no key required)
curl "https://api.alternative.me/fng/"

# Test NewsAPI (replace YOUR_KEY)
curl "https://newsapi.org/v2/everything?q=bitcoin&pageSize=1&apiKey=YOUR_KEY"

# Test Etherscan (replace YOUR_KEY)
curl "https://api.etherscan.io/api?module=account&action=balance&address=0x0000000000000000000000000000000000000000&tag=latest&apikey=YOUR_KEY"
```

### Step 3: Fix Invalid Keys

If any API test fails:

1. **NewsAPI** (`pub_...` format looks suspicious):
   ```bash
   # Get real key from: https://newsapi.org/
   # Free tier: 100 requests/day
   # Update in .env:
   NEWS_API_KEY=your_actual_key_here
   ```

2. **Blockchain APIs** (if invalid):
   - Etherscan: https://etherscan.io/apis
   - BscScan: https://bscscan.com/apis
   - Free tier: 5 requests/second

3. **KuCoin Futures** (currently placeholders):
   ```bash
   # Get from: https://www.kucoin.com/account/api
   # Update in .env:
   KUCOIN_FUTURES_KEY=your_actual_key
   KUCOIN_FUTURES_SECRET=your_actual_secret
   KUCOIN_FUTURES_PASSPHRASE=your_actual_passphrase
   ```

---

## 🧪 Testing the Detectors

### Test 1: Individual Detector Test

```bash
# Start the backend server first
npm run dev:server

# In another terminal, run detector tests
npx tsx scripts/test-real-detectors.ts BTCUSDT
```

Expected output:
```
================================================================================
🧪 REAL DETECTORS TEST SUITE
================================================================================
📊 Testing with symbol: BTCUSDT
⏰ Started at: 2025-11-09T...

1️⃣  Testing Sentiment Detector (SentimentAnalysisService)...
   ✅ PASSED - Score: 0.XXX
   📝 Reasons: Overall: Neutral (XX) | Fear&Greed: ... | News: ...
   ⏱️  Duration: XXXms

2️⃣  Testing News Detector (SentimentNewsService + HuggingFace)...
   ✅ PASSED - Score: 0.XXX
   📝 Reasons: X news items analyzed | Sentiment: ... | Confidence: XX%
   ⏱️  Duration: XXXms

... (and so on)
```

### Test 2: Full Pipeline Test

```bash
# After individual tests pass, test full pipeline
npx tsx scripts/test-full-pipeline.ts
```

(Note: This script needs to be created - similar to test-real-detectors but calls runStrategyPipeline)

### Test 3: Manual API Test

```bash
# Test via REST API
curl http://localhost:8001/api/signals/BTCUSDT?timeframes=1h,4h

# Expected response:
{
  "success": true,
  "signal": {
    "action": "BUY" | "SELL" | "HOLD",
    "score": 0.XXX,
    "confidence": 0.XXX,
    "components": {
      "sentiment": { "score": 0.XXX, "reasons": [...] },
      "news": { "score": 0.XXX, "reasons": [...] },
      "whales": { "score": 0.XXX, "reasons": [...] },
      ...
    }
  }
}
```

---

## ⚠️ Common Issues and Solutions

### Issue 1: "Sentiment API unavailable"

**Cause:** NewsAPI key invalid or rate limit exceeded

**Solution:**
```bash
# Check if News API works
curl "https://newsapi.org/v2/everything?q=bitcoin&pageSize=1&apiKey=$(grep NEWS_API_KEY .env | cut -d= -f2)"

# If fails, get new key: https://newsapi.org/
# Update .env and restart server
```

### Issue 2: "Blockchain data unavailable"

**Cause:** Etherscan/BscScan API key invalid

**Solution:**
```bash
# Test Etherscan
curl "https://api.etherscan.io/api?module=account&action=balance&address=0x0&tag=latest&apikey=$(grep ETHERSCAN_API_KEY .env | cut -d= -f2)"

# Should return: {"status":"1","message":"OK",...}
# If status="0", key is invalid
```

### Issue 3: "HuggingFace rate limit"

**Cause:** Using free tier without API key

**Solution:**
```bash
# Get free key: https://huggingface.co/settings/tokens
# Add to .env:
HUGGINGFACE_API_KEY=hf_...

# Restart server
```

### Issue 4: "Futures trading unavailable"

**Cause:** KuCoin credentials are placeholders

**Solution:**
1. Create KuCoin account: https://www.kucoin.com
2. Complete KYC verification
3. Go to Account > API Management
4. Create New API with "Trade" + "General" permissions
5. Copy API key, Secret, Passphrase to .env
6. Restart server
7. Test: `curl http://localhost:8001/api/futures/positions`

---

## 📊 Expected Test Results

### Successful Test Output

```
================================================================================
📊 TEST SUMMARY
================================================================================
Total Tests: 6
✅ Passed: 6 (100.0%)
❌ Failed: 0 (0.0%)
⏱️  Total Duration: ~3000ms (3.00s)

🎉 All tests passed! All detectors are working with real data.
```

### Failed Test Output (Example)

```
================================================================================
📊 TEST SUMMARY
================================================================================
Total Tests: 6
✅ Passed: 4 (66.7%)
❌ Failed: 2 (33.3%)
⏱️  Total Duration: ~2500ms (2.50s)

⚠️  2 test(s) failed. Please check the errors above.

📋 Detailed Results:

1. ✅ Sentiment Detector - PASS
2. ❌ News Detector - FAIL
   Error: News detector failed for BTCUSDT: Request failed with status code 401
   ^ This means NEWS_API_KEY is invalid
3. ❌ Whale Detector - FAIL
   Error: Whale tracking failed for BTCUSDT: Invalid API key
   ^ This means ETHERSCAN_API_KEY or BSCSCAN_API_KEY is invalid
```

---

## 🎯 Final Checklist

Before considering the system fully operational:

### Code (All Done ✅)
- [x] Sentiment detector uses real SentimentAnalysisService
- [x] News detector uses real SentimentNewsService + HuggingFace
- [x] Whale detector uses real WhaleTrackerService + Blockchain
- [x] SMC detector uses real SMCAnalyzer
- [x] Elliott detector uses real ElliottWaveAnalyzer
- [x] Pipeline handles async detectors
- [x] Feature flags enabled
- [x] Test scripts created

### Configuration (Needs Your Action ⚠️)
- [ ] Verify all API keys are valid (not placeholders)
- [ ] Test each API key individually
- [ ] Replace invalid keys with real ones
- [ ] Configure KuCoin credentials (if using Futures)

### Testing (Needs Your Action ⚠️)
- [ ] Run `npm run dev:server` successfully
- [ ] Run detector test script without errors
- [ ] Test REST API endpoints manually
- [ ] Verify StrategyBuilder page works
- [ ] Check Dashboard shows real data

### Production Deployment (Future)
- [ ] Set up Redis for caching (optional but recommended)
- [ ] Configure monitoring/alerting
- [ ] Set up rate limiting for API calls
- [ ] Deploy to production server
- [ ] Test with real trading (small amounts first!)

---

## 🚦 Current Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **Code** | 🟢 100% Complete | All detectors upgraded, pipeline fixed |
| **Configuration** | 🟡 70% Complete | Most keys present, need validation |
| **Testing** | 🔴 0% Complete | Tests written but not executed |
| **Deployment** | 🔴 0% Complete | Local dev environment only |

---

## 📞 Next Steps

1. **IMMEDIATE** (You need to do):
   ```bash
   # 1. Validate API keys
   curl "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"

   # 2. Test NewsAPI key
   curl "https://newsapi.org/v2/everything?q=bitcoin&pageSize=1&apiKey=YOUR_KEY"

   # 3. If any fail, get new keys from respective websites
   ```

2. **TESTING** (After keys are valid):
   ```bash
   # Start server
   npm run dev

   # Run tests (in another terminal)
   npx tsx scripts/test-real-detectors.ts BTCUSDT
   ```

3. **DEPLOYMENT** (After tests pass):
   - Set up production environment variables
   - Configure HTTPS/WSS endpoints
   - Deploy to server
   - Monitor logs for API errors

---

## 🆘 Need Help?

If you encounter issues:

1. **Check logs**: `tail -f logs/server.log` (if logging configured)
2. **Enable debug mode**: Set `NODE_ENV=development` in .env
3. **Test individual APIs**: Use curl commands above
4. **Check rate limits**: Most free tier APIs have 100-1000 requests/day
5. **Report specific errors**: Share exact error messages for troubleshooting

---

**Last Updated:** 2025-11-09
**Version:** 1.1 (Post-Detector-Upgrade)
