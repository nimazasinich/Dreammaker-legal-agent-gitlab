---
name: Exchange selector cleanup
about: Clean up exchange selector to reflect real capabilities
title: 'Clean up exchange selector to reflect real capabilities'
labels: ['medium-priority', 'ux', 'accuracy']
assignees: ''
---

## Goal
Make the exchange selector honest: KuCoin Futures is trading-capable; others may be data-only.

## Tasks
- [ ] Audit capabilities:
  - [ ] KuCoin Futures: trading + data
  - [ ] Binance: confirm data-only use (no trading)
  - [ ] Others: confirm status
- [ ] Update UI:
  - [ ] For non-trading exchanges, show "Data only (no trading)" label.
  - [ ] In production mode, consider disabling non-functional options.

## Acceptance Criteria
- Users cannot mistakenly believe spot/alt exchanges are fully tradable.
- Futures (KuCoin) is clearly marked as the only trading backend for now.

## Related
- JSON Checklist: `docs/production_checklist.v1.json` → section `exchange-selector-cleanup`
