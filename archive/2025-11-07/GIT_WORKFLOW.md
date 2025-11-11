# Safe Push & Merge to `main` - Futures Integration

**Purpose:** Safe, repeatable workflow to land the futures integration into `main` with minimal risk and instant rollback capability.

---

## Quick Reference: One-Shot Pre-Merge Verification

Run this on your feature branch before pushing:

```bash
bash scripts/pre-merge-verify.sh
```

This script will:
1. Check git status
2. Install dependencies (`npm ci`)
3. Run linter (`npm run lint`)
4. Build project (`npm run build`)
5. Verify integration (`bash scripts/verify-futures-integration.sh`)
6. Check feature flags default to false
7. Check for hardcoded secrets
8. Optionally run API smoke tests

---

## 0) Preconditions (do locally on your feature branch)

```bash
# Ensure you're on the feature branch
git status
# Should show: On branch feature/futures-integration

# Install dependencies and verify build
npm ci
npm run lint
npm run build

# Run integration verification
bash scripts/verify-futures-integration.sh
# Expected: ✅ All checks passed! Integration appears complete.

# IMPORTANT: Verify defaults are safe for main
# FEATURE_FUTURES should default to false in:
# - src/config/flags.ts (default: false)
# - .env.example (FEATURE_FUTURES=false)
```

**Pre-commit Checklist:**
- [ ] No secrets in code (all credentials via ENV)
- [ ] Feature flags default to `false` (safe for main)
- [ ] Build passes without errors
- [ ] Lint passes without errors
- [ ] Verification script passes

---

## 1) Conventional Commit (Signed, Clean)

```bash
# Stage all changes
git add -A

# Create signed commit with conventional commit format
git commit -S -m "feat(futures): integrate KuCoin Futures via adapter + APIs/WS behind FEATURE_FUTURES"

# If amending last commit after final fixes:
# git commit -S --amend --no-edit
```

**Commit Message Format:**
```
feat(futures): integrate KuCoin Futures via adapter + APIs/WS behind FEATURE_FUTURES

- Add futures types, interfaces, and provider adapter
- Implement REST API endpoints and WebSocket channel
- Add database migrations (v6) and repositories
- Add feature flags for safe rollout
- Include comprehensive documentation and test scripts

Breaking: None (feature-flagged, disabled by default)
```

**Commit Signing:**
- `-S` flag ensures commits are signed
- Verify signing key: `git log --show-signature`

---

## 2) Sync with Latest `main` (Rebase; No Merge Commits)

```bash
# Fetch latest from origin
git fetch origin

# Rebase feature branch onto latest main
git rebase origin/main

# If conflicts occur:
# 1. Resolve conflicts manually
# 2. Stage resolved files: git add <file>
# 3. Continue rebase: git rebase --continue

# After clean rebase, verify everything still works:
npm run build
bash scripts/verify-futures-integration.sh
```

**Rebase Benefits:**
- Clean, linear history
- Easier to review changes
- No merge commits cluttering history

**Conflict Resolution:**
- If conflicts in `src/server.ts`: Keep both route mounts
- If conflicts in `DatabaseMigrations.ts`: Keep both migrations (v5 and v6)
- If conflicts in `.env.example`: Merge both sections

---

## 3) Push Safely

```bash
# Only after clean rebase
# Use --force-with-lease to prevent overwriting others' work
git push --force-with-lease origin HEAD

# Alternative (if branch already exists):
git push --force-with-lease origin feature/futures-integration
```

**Safety Notes:**
- ✅ **Always use `--force-with-lease`** (never plain `--force`)
- This prevents accidentally overwriting teammates' commits
- If push fails, fetch and rebase again before retrying

---

## 4) Open a PR (or Update It) Against `main`

### Using GitHub CLI

```bash
gh pr create \
  --base main \
  --title "feat(futures): adapter-based futures integration behind flag" \
  --body-file PR_DESCRIPTION.md \
  --label "feature,futures,integration"
```

**Or use the template from `PR_DESCRIPTION.md`:**

### Using GitHub Web UI

**Title:**
```
feat(futures): adapter-based futures integration behind flag
```

**Description Template:**
```markdown
## Summary

Integrates KuCoin Futures trading capabilities from Project A into Project B via adapter pattern. Feature-flagged for safe rollout.

## Changes

- ✅ Futures types, interfaces, and provider adapter
- ✅ REST API endpoints (10 endpoints)
- ✅ WebSocket channel for real-time updates
- ✅ Database migrations (v6) and repositories
- ✅ Feature flags (`FEATURE_FUTURES`, `EXCHANGE_KUCOIN`)
- ✅ Comprehensive documentation and test scripts

## Documentation

- [Integration Alignment](INTEGRATION_PROMPT_ALIGNMENT.md) - 9-step verification
- [Operations Runbook](RUNBOOK.md) - Rollback procedures
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Verification checklist
- [Quick Start Guide](FUTURES_QUICKSTART.md) - Setup instructions
- [Integration Report](artifacts/FUTURES_INTEGRATION_COMPLETE.md) - Full details

## Safety

- ✅ Feature-flagged (`FEATURE_FUTURES=false` by default)
- ✅ No breaking changes (when flag OFF, system unchanged)
- ✅ Instant rollback via feature flag
- ✅ Database migrations idempotent
- ✅ No secrets in code (ENV-driven)

## Testing

- [x] Verification script passes: `bash scripts/verify-futures-integration.sh`
- [x] Build passes: `npm run build`
- [x] Lint passes: `npm run lint`

## Checklist

- [x] CI green (lint, build, tests)
- [x] Migration v6 present
- [x] Flags default to OFF
- [x] Smoke scripts included
- [x] Documentation updated
- [x] No secrets committed
```

**Labels:**
- `feature`
- `futures`
- `integration`
- `safe-rollout`

---

## 5) Require Green Checks Before Merge

### CI Pipeline Requirements

**Automated Checks:**
- [ ] Lint passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Unit tests pass (if applicable)
- [ ] Integration tests pass (if applicable)

**Manual Smoke Tests (Staging):**

**Phase 1 – Flag OFF:**
```bash
# Set FEATURE_FUTURES=false in staging .env
FEATURE_FUTURES=false npm run start

# Verify non-futures routes unchanged
curl -s http://localhost:3001/api/health
curl -s http://localhost:3001/api/market/prices

# Verify futures routes disabled
curl -s http://localhost:3001/api/futures/positions
# Expected: 404 with "Futures trading is disabled"
```

**Phase 2 – Flag ON:**
```bash
# Set FEATURE_FUTURES=true in staging .env
FEATURE_FUTURES=true npm run start

# Run smoke tests
bash scripts/test-futures-api.sh

# Test WebSocket
npx wscat -c ws://localhost:3001/ws/futures

# Test validation (should return 400)
curl -s -X POST http://localhost:3001/api/futures/orders \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDTM","side":"buy","type":"market","qty":0}'
# Expected: 400 Bad Request
```

---

## 6) Merge Strategy (Safe)

### Recommended: Squash Merge

**Benefits:**
- Linear history
- Single commit on `main`
- Easy to revert
- Clean rollback

**Using GitHub CLI:**
```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

**Using GitHub Web UI:**
1. Click "Merge pull request"
2. Select "Squash and merge"
3. Optionally delete branch after merge

**Merge Commit Message:**
```
feat(futures): integrate KuCoin Futures via adapter + APIs/WS behind FEATURE_FUTURES

Integrates futures trading capabilities from Project A into Project B via adapter pattern.
Feature-flagged for safe rollout with instant rollback capability.

- Add futures types, interfaces, and provider adapter
- Implement REST API endpoints and WebSocket channel
- Add database migrations (v6) and repositories
- Add feature flags for safe rollout
- Include comprehensive documentation and test scripts

Breaking: None (feature-flagged, disabled by default)
```

### Optional: Tag Release

```bash
# After merge, fetch latest
git fetch --tags origin main

# Checkout main
git checkout main
git pull --ff-only

# Create tag (use semantic versioning)
git tag -a v1.0.0-futures \
  -m "Futures integration (flagged)" \
  -m "Includes KuCoin Futures adapter, APIs, and WebSocket channel" \
  -m "Feature-flagged: FEATURE_FUTURES=false by default"

# Push tag
git push origin v1.0.0-futures
```

**See `CHANGELOG.md` for versioning guidelines.**

---

## 7) Post-Merge Verification (on `main`)

```bash
# Checkout main
git checkout main
git pull --ff-only

# Verify merge commit
git log --oneline -1
# Should show the squash merge commit

# Install and build
npm ci
npm run build

# Verify defaults are safe
grep "FEATURE_FUTURES" src/config/flags.ts
# Should show: export const FEATURE_FUTURES = process.env.FEATURE_FUTURES === 'true';

# Start server (with flag OFF by default)
npm run start

# Verify system behaves as before (flag OFF)
curl -s http://localhost:3001/api/health
curl -s http://localhost:3001/api/futures/positions
# Expected: 404 (futures disabled by default)
```

**Post-Merge Checklist:**
- [ ] Main branch builds successfully
- [ ] Migration v6 applies automatically
- [ ] Default behavior unchanged (flag OFF)
- [ ] No breaking changes introduced
- [ ] Documentation accessible

---

## Rollback (Instant → Progressive)

### Level 1: Instant Rollback (< 2 minutes)

**Symptom:** Issues detected immediately after merge.

**Action:**
1. Set `FEATURE_FUTURES=false` in production `.env`
2. Restart server/service
3. Verify futures endpoints return 404
4. Verify non-futures functionality works

**Time:** < 2 minutes  
**Impact:** Futures disabled, system returns to pre-integration state

---

### Level 2: PR Revert (Clean)

**Symptom:** Need to remove integration entirely.

**Action (GitHub UI):**
1. Go to PR page
2. Click "Revert" button
3. Create revert PR
4. Merge revert PR

**Action (GitHub CLI):**
```bash
# Create revert PR
gh pr revert <PR_NUMBER>

# Or manually:
git checkout main
git pull --ff-only
git revert <merge_commit_sha>
git push origin main
```

**Time:** < 10 minutes  
**Impact:** All integration code removed from main

---

### Level 3: Git Revert (CLI)

**Symptom:** Need to revert specific commit.

**Action:**
```bash
# Find merge commit SHA
git log --oneline | head -n 5

# Revert commit (creates new revert commit)
git revert <merge_commit_sha>

# Push revert
git push origin main
```

**Time:** < 5 minutes  
**Impact:** Reverts integration while preserving history

---

### Level 4: Database Recovery (If Needed)

**Symptom:** Database issues or migration problems.

**Action:**
```bash
# Stop server
# Restore database backup
cp data/boltai-backup-YYYY-MM-DD.db data/boltai.db

# Set feature flag OFF
echo "FEATURE_FUTURES=false" >> .env

# Restart server
npm run start
```

**Time:** < 10 minutes  
**Impact:** Database restored, futures disabled

---

## Git Safety Rules

### ✅ DO

- ✅ Use `--force-with-lease` (never plain `--force`)
- ✅ Sign commits with `-S` flag
- ✅ Use conventional commit messages
- ✅ Rebase before push (not merge)
- ✅ Verify build/lint before commit
- ✅ Keep secrets out of commits

### ❌ DON'T

- ❌ Force push without `--force-with-lease`
- ❌ Commit secrets or credentials
- ❌ Merge instead of rebase
- ❌ Push without verifying build
- ❌ Skip lint checks
- ❌ Overwrite others' work

---

## Troubleshooting

### Push Fails: "Updates were rejected"

**Cause:** Remote has changes you don't have locally.

**Solution:**
```bash
git fetch origin
git rebase origin/main
git push --force-with-lease origin HEAD
```

---

### Rebase Conflicts

**Cause:** Main branch has changes conflicting with your branch.

**Solution:**
```bash
# During rebase, resolve conflicts:
git status  # See conflicted files
# Edit files to resolve conflicts
git add <resolved-file>
git rebase --continue

# If needed, abort and merge instead:
git rebase --abort
git merge origin/main
```

---

### Commit Already Pushed

**Cause:** Need to amend commit that's already pushed.

**Solution:**
```bash
# Amend commit locally
git commit --amend -S --no-edit

# Force push safely
git push --force-with-lease origin HEAD
```

---

## Checklist Summary

**Before Push:**
- [ ] Build passes
- [ ] Lint passes
- [ ] Verification script passes
- [ ] Feature flags default to false
- [ ] No secrets in code
- [ ] Commits signed

**Before PR:**
- [ ] Rebased on latest main
- [ ] No merge commits
- [ ] All conflicts resolved
- [ ] Tests pass

**Before Merge:**
- [ ] CI green
- [ ] Smoke tests pass (Phase 1 & 2)
- [ ] Review approved
- [ ] Documentation complete

**After Merge:**
- [ ] Post-merge verification passes
- [ ] System behaves as before (flag OFF)
- [ ] Tag created (optional)

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-06  
**Status:** ✅ Ready for Use
