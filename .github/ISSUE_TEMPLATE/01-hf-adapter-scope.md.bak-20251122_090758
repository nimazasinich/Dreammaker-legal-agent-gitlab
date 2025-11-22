---
name: HF Adapter Scope Clarification
about: Clarify and lock HF adapter scope (market data only)
title: 'Clarify and lock HF adapter scope (market data only)'
labels: ['high-priority', 'documentation', 'architecture']
assignees: ''
---

## Goal
Prevent accidental misuse of HuggingFace adapters and make it explicit that HF is used for market-data only, not for SMC/Elliott/signal storage.

## Tasks
- [x] docs/hf-engine-scope.md created with:
  - ✅ HF does: prices, OHLCV, market overview, health, providers
  - 🚫 HF does NOT do: SMC, Elliott, signal storage (local only)
- [ ] Add brief inline references in `src/services/hf/*Adapter.ts` to `docs/hf-engine-scope.md`
- [ ] Verify and document local authoritative implementations:
  - `SMCAnalyzer`
  - `ElliottWaveAnalyzer`
  - `SignalEngine`

## Acceptance Criteria
- All HF adapters have a one-line reference to the scope doc.
- Internal docs clearly treat HF as market-data-only for advanced analysis.
- No code path silently falls back to HF for SMC/Elliott/signals.

## Related
- JSON Checklist: `docs/production_checklist.v1.json` → section `hf-adapter-scope`
