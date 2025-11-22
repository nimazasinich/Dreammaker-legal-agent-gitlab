---
name: Hash-based navigation
about: Add URL hash routing on top of NavigationProvider
title: 'Add URL hash routing on top of NavigationProvider'
labels: ['medium-priority', 'feature', 'navigation']
assignees: ''
---

## Goal
Enable deep links and browser history without migrating to React Router.

## Tasks
- [ ] Keep `NavigationProvider` as the single source of truth.
- [ ] Define mapping: view → hash
  - `dashboard` → `#/dashboard`
  - `scanner` → `#/scanner`
  - `trading` → `#/trading`
  - etc.
- [ ] On app load, read `window.location.hash` and set initial view.
- [ ] On `currentView` change, update `window.location.hash`.
- [ ] On `hashchange` event, update `currentView`.

## Acceptance Criteria
- Visiting `/#/scanner` opens the Scanner view.
- Browser back/forward navigates between views.
- Existing navigation UI continues to work unchanged.

## Related
- JSON Checklist: `docs/production_checklist.v1.json` → section `url-hash-navigation`
