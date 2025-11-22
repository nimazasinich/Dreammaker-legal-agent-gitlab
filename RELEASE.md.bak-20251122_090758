# Release Guide

This guide covers the complete release workflow for DreammakerCryptoSignalAndTrader, from local testing to production deployment.

## Table of Contents

1. [Quick Release](#quick-release)
2. [Automated Release (Recommended)](#automated-release-recommended)
3. [Manual Release](#manual-release)
4. [Pre-release (RC) Workflow](#pre-release-rc-workflow)
5. [Post-Release Validation](#post-release-validation)
6. [Rollback Strategy](#rollback-strategy)
7. [GitHub Actions & CD Pipeline](#github-actions--cd-pipeline)

---

## Quick Release

For patch releases (bug fixes, minor improvements):

```bash
# Ensure you're on a clean main branch
git checkout main && git pull

# Run automated release
npm run release:patch

# CD pipeline automatically:
# 1. Builds Docker images
# 2. Pushes to GHCR
# 3. Deploys to production
# 4. Creates GitHub Release
```

**That's it!** The tag push triggers the entire CD pipeline.

---

## Automated Release (Recommended)

The `scripts/release.mjs` tool handles versioning, changelog generation, and tagging automatically.

### Prerequisites

- Clean working tree (no uncommitted changes)
- On `main` or `master` branch
- GitHub secrets configured (see [CD Pipeline](#github-actions--cd-pipeline))

### Commands

```bash
# Patch release (1.0.0 → 1.0.1)
npm run release:patch

# Minor release (1.0.1 → 1.1.0)
npm run release:minor

# Major release (1.1.0 → 2.0.0)
npm run release:major

# Release candidate (1.1.0 → 1.1.0-rc.1)
npm run release:rc

# Explicit version
npm run release:set -- v1.2.3
```

### What Happens

1. **Safety checks**: Ensures clean working tree and correct branch
2. **Version bump**: Updates `package.json` (except for RC releases)
3. **Changelog**: Generates release notes from git commits
4. **Tag creation**: Creates annotated git tag with changelog
5. **Push**: Pushes tag to GitHub (triggers CD pipeline)

### Release Notes Format

Generated automatically from commit messages:

```markdown
# v1.0.1

Changes since v1.0.0:
* feat: add production hardening and comprehensive local testing suite (fdfe647)
* fix: resolve Redis connection timeout (a1b2c3d)
* docs: update deployment guide (e4f5g6h)
```

---

## Manual Release

For advanced scenarios or when the automated tool is unavailable:

```bash
# 1. Update version in package.json
vim package.json  # Change version to 1.0.1

# 2. Commit version bump
git add package.json
git commit -m "chore(release): bump version to v1.0.1"

# 3. Create annotated tag
git tag -a v1.0.1 -m "Release v1.0.1

* feat: add new trading signals
* fix: improve error handling
* docs: update API documentation"

# 4. Push tag (triggers CD)
git push origin v1.0.1
```

---

## Pre-release (RC) Workflow

Use release candidates for testing before stable releases:

```bash
# Create first RC
npm run release:rc  # Creates v1.1.0-rc.1

# Test in staging environment
# Fix issues, commit to main

# Create next RC
npm run release:rc  # Creates v1.1.0-rc.2

# When ready for stable release
npm run release:minor  # Creates v1.1.0
```

### RC Behavior

- **Images built**: Yes, tagged as `v1.1.0-rc.1` and pushed to GHCR
- **GitHub Release**: Created and marked as "Pre-release"
- **Package.json**: Not updated (avoids churn during RC iterations)
- **CD deployment**: RC tags deploy to production by default

#### Skip RC Deployment (Optional)

To prevent RC tags from deploying to production, update `.github/workflows/cd.yml`:

```yaml
on:
  push:
    tags:
      # Only stable releases (no RC/beta/alpha)
      - "v[0-9]+.[0-9]+.[0-9]+"
```

---

## Post-Release Validation

### 1. Verify GitHub Release

1. Go to https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader/releases
2. Confirm release appears with correct version and notes
3. Check that Docker pull commands are present

### 2. Verify GHCR Images

```bash
# Check images were published
docker pull ghcr.io/nimazasinich/dcs-server:v1.0.1
docker pull ghcr.io/nimazasinich/dcs-client:v1.0.1

# Verify latest tag updated
docker pull ghcr.io/nimazasinich/dcs-server:latest
```

### 3. Production Smoke Tests

SSH to your production server:

```bash
ssh user@your-production-server

# Health check
curl -sf http://localhost:8000/status/health || echo "FAIL"

# System status
curl -s http://localhost:8000/api/system/status | jq '.providers'

# HF API endpoints
curl -s "http://localhost:8000/api/hf/ohlcv?symbol=BTCUSDT&timeframe=1h&limit=120" | jq '.rows | length'

# Sentiment analysis
curl -s -X POST "http://localhost:8000/api/hf/sentiment" \
  -H "content-type: application/json" \
  -d '{"texts":["BTC bullish"]}' | jq '.results[0].label'

# Metrics
curl -s http://localhost:8000/metrics | grep nodejs_version_info
```

### 4. Monitor Logs

```bash
# View deployment logs
docker logs -f $(docker ps -qf "name=server") --tail=100

# Check for errors
docker logs $(docker ps -qf "name=server") 2>&1 | grep -i error
```

---

## Rollback Strategy

### Quick Rollback

If a release introduces critical issues:

```bash
# Option 1: Tag a previous good commit
git tag -a v1.0.2-rollback -m "Rollback to v1.0.0" v1.0.0
git push origin v1.0.2-rollback

# Option 2: Revert and create hotfix
git revert <bad-commit-sha>
git push origin main
npm run release:patch  # Creates v1.0.3 with revert
```

### Manual Rollback on Server

SSH to production:

```bash
# Pull specific version
docker pull ghcr.io/nimazasinich/dcs-server:v1.0.0
docker pull ghcr.io/nimazasinich/dcs-client:v1.0.0

# Update docker-compose.yml to pin versions
vim docker-compose.prod.yml
# Change:
#   image: ghcr.io/nimazasinich/dcs-server:latest
# To:
#   image: ghcr.io/nimazasinich/dcs-server:v1.0.0

# Restart services
docker compose -f docker-compose.prod.yml up -d
```

### Verify Rollback

```bash
# Check running version
curl -s http://localhost:8000/api/system/status | jq '.version'

# Monitor logs
docker logs -f $(docker ps -qf "name=server") --tail=50
```

---

## GitHub Actions & CD Pipeline

### Required Secrets

Set these in GitHub repository settings (`Settings` → `Secrets and variables` → `Actions`):

```
SSH_HOST              # Production server IP/hostname
SSH_USER              # SSH username for deployment
SSH_KEY               # Private SSH key (RSA or ED25519)
SSH_PORT              # SSH port (optional, defaults to 22)

HUGGINGFACE_API_KEY   # HuggingFace API key
REDIS_URL             # Redis connection string (optional)
TELEGRAM_BOT_TOKEN    # Telegram bot token (optional)
TELEGRAM_CHAT_ID      # Telegram chat ID (optional)
```

### Workflows

#### 1. CD Pipeline (`.github/workflows/cd.yml`)

Triggered by: Push to tags matching `v*`

Steps:
1. Checkout code
2. Login to GitHub Container Registry
3. Build and push server image
4. Build and push client image
5. SSH to production server
6. Pull latest images
7. Restart services with zero downtime

#### 2. Release Automation (`.github/workflows/release.yml`)

Triggered by: Push to tags matching `v*`

Steps:
1. Generate changelog from commits
2. Determine if pre-release (RC/beta/alpha)
3. Create GitHub Release with notes
4. Add Docker pull commands to release notes
5. Comment on related issues (stable releases only)

### Pipeline Monitoring

View workflow runs:
```
https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader/actions
```

### Troubleshooting CD Failures

#### Build Failures

```bash
# Test build locally
docker build -t test-server --target server-runner .
docker build -t test-client --target client-static .
```

#### Deployment Failures

Check SSH access:

```bash
# Test SSH connection
ssh -i /path/to/key user@server "echo 'Connected'"

# Verify SSH key format
head -1 /path/to/key  # Should be: -----BEGIN OPENSSH PRIVATE KEY-----
```

#### Image Pull Failures

Ensure GHCR access:

```bash
# On production server
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
docker pull ghcr.io/nimazasinich/dcs-server:latest
```

---

## Release Checklist

Before creating a release:

- [ ] All CI checks passing
- [ ] Local tests pass (`npm test`)
- [ ] Docker build succeeds (`docker compose -f deploy/docker-compose.prod.yml build`)
- [ ] Local smoke tests pass (`./deploy/test-local.sh`)
- [ ] Documentation updated
- [ ] CHANGELOG updated (if manual release)
- [ ] Version number follows [SemVer](https://semver.org/)
- [ ] Breaking changes documented (for major releases)

After release:

- [ ] GitHub Release created
- [ ] Docker images published to GHCR
- [ ] Production deployment successful
- [ ] Smoke tests pass on production
- [ ] No errors in production logs
- [ ] Related issues commented/closed

---

## Version Naming Convention

Follow [Semantic Versioning](https://semver.org/):

```
v<MAJOR>.<MINOR>.<PATCH>[-<PRERELEASE>]

Examples:
  v1.0.0        # Initial stable release
  v1.0.1        # Patch: bug fixes
  v1.1.0        # Minor: new features (backward compatible)
  v2.0.0        # Major: breaking changes
  v1.1.0-rc.1   # Release candidate
  v1.1.0-beta.1 # Beta release
```

### When to Bump

- **Patch** (v1.0.0 → v1.0.1): Bug fixes, security patches, minor improvements
- **Minor** (v1.0.0 → v1.1.0): New features, non-breaking API additions
- **Major** (v1.0.0 → v2.0.0): Breaking changes, API redesigns
- **RC** (v1.0.0 → v1.0.1-rc.1): Pre-release testing

---

## Advanced Scenarios

### Hotfix for Production

```bash
# 1. Create hotfix branch from production tag
git checkout -b hotfix/critical-bug v1.0.0

# 2. Fix the issue
# ... make changes ...
git commit -am "fix: resolve critical bug"

# 3. Merge to main
git checkout main
git merge hotfix/critical-bug

# 4. Release hotfix
npm run release:patch  # Creates v1.0.1

# 5. Clean up
git branch -d hotfix/critical-bug
```

### Parallel Release Branches

For maintaining multiple major versions:

```bash
# v1.x maintenance
git checkout -b release/1.x v1.5.0
# ... apply fixes ...
git tag v1.5.1
git push origin v1.5.1

# v2.x development continues on main
git checkout main
npm run release:minor  # v2.1.0
```

### Emergency Rollback

For immediate production issues:

```bash
# 1. SSH to production
ssh user@production-server

# 2. Quick rollback to previous tag
docker compose -f docker-compose.prod.yml pull
# Edit docker-compose.prod.yml, change image tags to previous version
docker compose -f docker-compose.prod.yml up -d

# 3. Verify
curl -sf http://localhost:8000/status/health

# 4. Investigate and prepare proper hotfix
```

---

## Resources

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Container Registry](https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Compose](https://docs.docker.com/compose/)
- [GitHub Actions](https://docs.github.com/actions)

---

## Questions?

- **Local testing not working?** See [deploy/TESTING.md](deploy/TESTING.md)
- **CD pipeline failing?** Check [workflow runs](https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader/actions)
- **Need help?** Open an [issue](https://github.com/nimazasinich/DreammakerCryptoSignalAndTrader/issues)
