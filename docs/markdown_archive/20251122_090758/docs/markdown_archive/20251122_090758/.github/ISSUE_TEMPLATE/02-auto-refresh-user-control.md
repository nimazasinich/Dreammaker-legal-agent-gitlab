---
name: Auto-refresh with user control
about: Add auto-refresh with user control for data and trading contexts
title: 'Add auto-refresh with user control for data and trading contexts'
labels: ['high-priority', 'feature', 'ux']
assignees: ''
---

## Goal
Re-enable safe auto-refresh for market/trading data with explicit user control, without overloading providers.

## Tasks
- [ ] Re-enable refresh timers in:
  - `DataContext`
  - `TradingContext`
  with default interval (e.g. 60s)
- [ ] Add settings in `SettingsView`:
  - [ ] Toggle: "Auto refresh data: On/Off"
  - [ ] Interval selector: `30s`, `60s`, `120s`
- [ ] Ensure Futures WebSocket remains the primary real-time source.
- [ ] Use polling only as a safety net when WS is unavailable.

## Acceptance Criteria
- User can enable/disable auto-refresh and choose interval.
- WS-first behavior is preserved.
- No significant increase in backend load in default configuration.

## Related
- JSON Checklist: `docs/production_checklist.v1.json` → section `auto-refresh-with-user-control`
