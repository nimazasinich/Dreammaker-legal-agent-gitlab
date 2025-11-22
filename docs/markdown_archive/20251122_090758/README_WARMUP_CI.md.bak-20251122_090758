# CI & Warmup Notes
- **CI** runs on every push/PR: typecheck, lint, build (client+server), unit tests.
- **Nightly Warmup** builds, starts server on PORT 8000, and curls:
  - `/status/health`
  - `/api/system/status`
  - `/api/hf/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=120`
  - `/api/hf/sentiment` with two sample texts
- **Local smoke**: `npm run build && npm run build:server && npm run smoke`
- No UI changes. No deletions. Additive only.
