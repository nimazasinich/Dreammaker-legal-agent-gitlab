# PR Description Template

## Title
```
feat(futures): adapter-based futures integration behind flag
```

## Description

### Summary
- ✅ Futures integration (KuCoin) via provider adapter + services, API routes, WS channel
- ✅ Feature-flagged (`FEATURE_FUTURES`), backward-compatible when OFF
- ✅ Migration v6 (idempotent), repos added, docs updated
- ✅ **KuCoin API fixes applied:** Correct leverage endpoints, symbol normalization, order field mapping

### Changes
- **Types & Interfaces:** `src/types/futures.ts`, `src/providers/futures/IFuturesExchange.ts`
- **Provider Adapter:** `src/providers/futures/KucoinFuturesAdapter.ts` (refactored from Project A)
  - ✅ Correct leverage endpoints: `/api/v2/changeCrossUserLeverage` (cross) & `/api/v1/position/risk-limit-level/change` (isolated)
  - ✅ Symbol normalization: `BTC-USDTM` → `XBTUSDTM` (no dash, BTC→XBT)
  - ✅ Order field mapping: `stopLoss` → `stop` + `stopPrice` + `stopPriceType`
- **Services:** `src/services/FuturesService.ts` - Orchestrates adapter + repositories
  - ✅ Added `closePosition()` helper with `reduceOnly: true`
- **Controllers & Routes:** `src/controllers/FuturesController.ts`, `src/routes/futures.ts`
  - ✅ Added `DELETE /api/futures/positions/:symbol` endpoint
- **WebSocket:** `src/ws/futuresChannel.ts` - Real-time updates channel
- **Database:** Migration v6 (`create_futures_tables`) + repositories
- **Config:** Feature flags (`FEATURE_FUTURES`, `EXCHANGE_KUCOIN`) added

### API Endpoints
- `GET /api/futures/positions` - Get positions
- `POST /api/futures/orders` - Place order
- `GET /api/futures/orders` - Get open orders
- `DELETE /api/futures/orders/:id` - Cancel order
- `DELETE /api/futures/orders` - Cancel all orders
- `PUT /api/futures/leverage` - Set leverage
- `GET /api/futures/account/balance` - Get balance
- `GET /api/futures/orderbook/:symbol` - Get orderbook
- `GET /api/futures/funding/:symbol` - Get funding rate
- `GET /api/futures/funding/:symbol/history` - Get funding history
- `DELETE /api/futures/positions/:symbol` - Close position (NEW)

### WebSocket
- Channel: `ws://localhost:3001/ws/futures`
- Events: `position_update`, `order_update`, `funding_tick`

---

## Acceptance Criteria

- ✅ Build/lint green; migration v6 auto-applies on startup
- ✅ REST endpoints OK; invalid payloads → typed 4xx
- ✅ WS emits `position_update` / `order_update` / `funding_tick`
- ✅ With `FEATURE_FUTURES=false`, behavior matches pre-integration

---

## Safety

- ✅ **Feature-flagged:** `FEATURE_FUTURES=false` by default
- ✅ **No breaking changes:** System unchanged when flag OFF
- ✅ **Instant rollback:** Set `FEATURE_FUTURES=false` and restart
- ✅ **Database migrations:** Idempotent (safe to run multiple times)
- ✅ **No secrets:** All credentials via ENV variables

---

## Rollback

### Level 1: Instant (< 2 min)
Set `FEATURE_FUTURES=false` → restart

### Level 2: PR Revert (< 10 min)
GitHub "Revert" button on squash merge

### Level 3: Git Revert (< 5 min)
```bash
git revert <merge_commit_sha>
git push origin main
```

### Level 4: DB Recovery (< 10 min)
Restore backup + set `FEATURE_FUTURES=false`

---

## Artifacts

### Documentation
- [Integration Alignment](INTEGRATION_PROMPT_ALIGNMENT.md) - 9-step verification
- [Operations Runbook](RUNBOOK.md) - Rollback procedures
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Verification checklist
- [Quick Start Guide](FUTURES_QUICKSTART.md) - Setup instructions
- [Git Workflow](GIT_WORKFLOW.md) - Safe merge procedures
- [Integration Report](artifacts/FUTURES_INTEGRATION_COMPLETE.md) - Full details

### Test Scripts
- `scripts/verify-futures-integration.sh` - Integration verification
- `scripts/test-futures-api.sh` - REST API smoke tests
- `scripts/test-futures-api.ps1` - PowerShell smoke tests
- `scripts/pre-merge-verify.sh` - Pre-merge verification

### Updated Docs
- `docs/New folder/ENDPOINTS.md` - Futures Trading Endpoints section
- `docs/assimilation/KUCOIN_API_FIXES.md` - KuCoin API corrections documentation
- `docs/assimilation/VERIFICATION_SUMMARY.md` - Verification results
- `FUTURES_INTEGRATION_FINAL_STATUS.md` - Final status report

---

## Testing

### Pre-Merge Verification
```bash
bash scripts/pre-merge-verify.sh
```

### Smoke Tests
```bash
# Flag OFF
FEATURE_FUTURES=false npm run start
curl -s http://localhost:3001/api/futures/positions  # Should return 404

# Flag ON
FEATURE_FUTURES=true npm run start
bash scripts/test-futures-api.sh
```

---

## Checklist

- [x] Build passes (`npm run build`)
- [x] Lint passes (`npm run lint`)
- [x] Verification script passes (`bash scripts/verify-futures-integration.sh`)
- [x] Feature flags default to `false`
- [x] No secrets in code
- [x] Migration v6 present
- [x] Documentation updated
- [x] Test scripts included

---

## Related Issues

Closes #[issue-number]

---

**Ready for Review** ✅
