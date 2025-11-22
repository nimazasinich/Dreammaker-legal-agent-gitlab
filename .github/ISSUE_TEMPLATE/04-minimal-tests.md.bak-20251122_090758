---
name: Minimal tests for RiskGuard & TradeEngine
about: Add minimal test coverage for RiskGuard and TradeEngine
title: 'Add minimal test coverage for RiskGuard and TradeEngine'
labels: ['medium-priority', 'testing', 'critical-path']
assignees: ''
---

## Goal
Lock in critical risk and execution behavior with a very small but high-leverage test set.

## Tasks
- [ ] Create `src/services/__tests__/RiskGuard.test.ts`
  - [ ] Passing case: trade within position size & limits → `allowed: true`
  - [ ] Failing case: trade exceeding max position size → `allowed: false`
- [ ] Create `src/services/__tests__/TradeEngine.test.ts`
  - [ ] OFF mode: `executeSignal` must NOT call ExchangeClient; trade is blocked.
  - [ ] TESTNET mode: `executeSignal` calls ExchangeClient; result type is propagated.

## Acceptance Criteria
- Tests pass in local dev.
- CI (once added) fails if these behaviors regress.

## Related
- JSON Checklist: `docs/production_checklist.v1.json` → section `minimal-tests`
