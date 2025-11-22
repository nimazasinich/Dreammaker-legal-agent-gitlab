# Futures Integration - Quick Start Guide

## ✅ Integration Complete

The futures trading capabilities from Project A have been successfully integrated into Project B (baseline crypto-scoring-system-fixed).

## 🚀 Quick Start

### 1. Configure Environment

Copy `.env.example` to `.env` and update KuCoin Futures credentials:

```bash
cp .env.example .env
# Edit .env and set:
# FEATURE_FUTURES=true
# KUCOIN_FUTURES_KEY=your_key
# KUCOIN_FUTURES_SECRET=your_secret
# KUCOIN_FUTURES_PASSPHRASE=your_passphrase
```

### 2. Verify Integration

Run the verification script:

```bash
bash scripts/verify-futures-integration.sh
```

### 3. Install & Start

```bash
npm ci
npm run build
npm run start
```

**Note:** Database migrations will automatically apply on startup (migration v6 creates futures tables).

### 4. Test API Endpoints

**Linux/macOS:**
```bash
bash scripts/test-futures-api.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\test-futures-api.ps1
```

**Manual curl tests:**
```bash
# Get positions
curl -s http://localhost:3001/api/futures/positions

# Close position
curl -s -X DELETE http://localhost:3001/api/futures/positions/BTCUSDTM

# Place order
curl -s -X POST http://localhost:3001/api/futures/orders \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDTM","side":"buy","type":"market","qty":1,"leverage":5,"marginMode":"isolated"}'

# Set leverage
curl -s -X PUT http://localhost:3001/api/futures/leverage \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDTM","leverage":5,"marginMode":"isolated"}'

# Get funding rate
curl -s http://localhost:3001/api/futures/funding/BTCUSDTM
```

### 5. Test WebSocket

```bash
# Install wscat if needed
npm install -g wscat

# Connect to futures channel
wscat -c ws://localhost:3001/ws/futures
```

Expected events:
- `position_update` - Real-time position updates
- `order_update` - Order status changes
- `funding_tick` - Funding rate updates

## 📋 Feature Flag Rollout

### Phase 1: Staging (Flags OFF)
```bash
FEATURE_FUTURES=false
```
- Verify non-futures routes work exactly as before
- Futures routes should return 404

### Phase 2: Staging (Flags ON)
```bash
FEATURE_FUTURES=true
EXCHANGE_KUCOIN=true
```
- Run smoke tests
- Verify API endpoints respond correctly
- Test WebSocket channel

### Phase 3: Production
- Enable flags after staging verification
- Monitor error rates
- Keep flags for instant rollback capability

## 📚 Documentation

- **API Endpoints:** `docs/New folder/ENDPOINTS.md` (section: Futures Trading Endpoints)
- **Integration Report:** `artifacts/FUTURES_INTEGRATION_COMPLETE.md`
- **Environment Variables:** `.env.example`

## 🔍 Troubleshooting

### Endpoints return 404
- Check `FEATURE_FUTURES=true` in `.env`
- Verify server is running on correct port
- Check server logs for errors

### API errors (401/403)
- Verify KuCoin Futures credentials are correct
- Check API key permissions (futures trading enabled)
- Ensure passphrase matches API key creation

### WebSocket connection fails
- Verify `FEATURE_FUTURES=true`
- Check URL: `ws://localhost:3001/ws/futures`
- Review server logs for connection errors

### Database errors
- Verify migration v6 applied successfully
- Check database file permissions
- Review `data/boltai.db` exists and is accessible

## ✅ Success Checklist

- [ ] Server starts without errors
- [ ] Migration v6 applied automatically
- [ ] `GET /api/futures/positions` returns valid response (or 401 if no credentials)
- [ ] Invalid order payloads return 400 validation errors
- [ ] WebSocket connects and receives events
- [ ] With `FEATURE_FUTURES=false`, futures routes disabled (404)
- [ ] Non-futures routes unchanged

## 📝 Notes

- **Provider-agnostic design** allows future Binance/Bybit integration
- **Feature flags** enable safe gradual rollout
- **Backward compatible** - no breaking changes to existing functionality
- **Database sync** between exchange and local storage
- **Real-time updates** via WebSocket every 5 seconds

For detailed API documentation, see `docs/New folder/ENDPOINTS.md`.
