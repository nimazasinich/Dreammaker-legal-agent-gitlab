# Deployment Checklist

This comprehensive checklist ensures safe, reliable deployment of the DreammakerCryptoSignalAndTrader application to staging and production environments.

## Pre-Deployment Checklist

### 1. Before You Start

#### Infrastructure Readiness

- [ ] **HF Engine endpoint is healthy**
  ```bash
  curl -f https://really-amin-datasourceforcryptocurrency.hf.space/health
  ```

- [ ] **Exchange endpoints are reachable**
  - [ ] Testnet (staging): `https://api-sandbox-futures.kucoin.com`
  - [ ] Mainnet (production): `https://api-futures.kucoin.com`

- [ ] **Backend server is provisioned**
  - [ ] Adequate resources (2+ CPU, 4GB+ RAM recommended)
  - [ ] Ports 8001 (backend), 80/443 (frontend) are available
  - [ ] SSL certificates are valid (for production HTTPS)

- [ ] **Database/storage is configured**
  - [ ] `/data` directory is writable
  - [ ] `/config` directory is writable
  - [ ] Backups are configured (if applicable)

#### Secrets Management

- [ ] **All secrets are secured**
  - [ ] NO secrets committed to Git
  - [ ] Secrets stored in vault/secrets manager
  - [ ] Environment variables configured for runtime injection

- [ ] **Required API keys are valid**
  - [ ] `HF_TOKEN` / `HUGGINGFACE_API_KEY`
  - [ ] `KUCOIN_FUTURES_KEY`
  - [ ] `KUCOIN_FUTURES_SECRET`
  - [ ] `KUCOIN_FUTURES_PASSPHRASE`
  - [ ] `REDIS_PASSWORD` (if using Redis)

- [ ] **Exchange credentials are tested**
  ```bash
  # Test KuCoin credentials (adjust for your environment)
  curl -X GET "https://api-sandbox-futures.kucoin.com/api/v1/account-overview" \
    -H "KC-API-KEY: $KUCOIN_FUTURES_KEY" \
    -H "KC-API-PASSPHRASE: $KUCOIN_FUTURES_PASSPHRASE"
  ```

---

### 2. Code Quality & CI Status

#### Version Control

- [ ] **Working branch is up to date**
  ```bash
  git fetch origin
  git status
  ```

- [ ] **All changes are committed**
  ```bash
  git status
  # Should show "nothing to commit, working tree clean"
  ```

- [ ] **Latest commit hash is recorded**
  ```bash
  git rev-parse HEAD
  ```

#### CI Pipeline Status

- [ ] **Latest CI run is green** ✅
  - Check: https://github.com/your-repo/actions
  - All jobs passed:
    - [ ] Lint
    - [ ] Type check
    - [ ] Tests
    - [ ] Build client
    - [ ] Build server
    - [ ] Docker build test

- [ ] **No pending security alerts**
  - Check: GitHub Security tab
  - Run: `npm audit --production`

#### Local Validation

- [ ] **Lint passes locally**
  ```bash
  npm run lint
  ```

- [ ] **Type check passes**
  ```bash
  npm run typecheck
  ```

- [ ] **All tests pass**
  ```bash
  npm test
  ```

- [ ] **Build succeeds**
  ```bash
  npm run build
  # Check that dist/ directory is created
  ls -la dist/
  ```

---

### 3. Configuration Validation

#### Runtime Profile Selection

- [ ] **Correct profile is selected**
  - [ ] Staging: Using `env.staging`
  - [ ] Production: Using `env.production`

- [ ] **Data policy is enforced**
  ```bash
  # Verify these settings in your env file:
  grep "VITE_APP_MODE=online" env.production
  grep "VITE_STRICT_REAL_DATA=true" env.production
  grep "VITE_USE_MOCK_DATA=false" env.production
  grep "VITE_ALLOW_FAKE_DATA=false" env.production
  ```

- [ ] **Exchange endpoints are correct**
  - [ ] Staging uses TESTNET URLs
  - [ ] Production uses MAINNET URLs
  ```bash
  grep "FUTURES_BASE_URL" env.production
  ```

#### Environment Configuration

- [ ] **API endpoints are correct**
  ```bash
  # Staging
  grep "VITE_API_BASE" env.staging
  # Production
  grep "VITE_API_BASE" env.production
  ```

- [ ] **Backend configuration is appropriate**
  - [ ] `WATCHED_SYMBOLS` includes desired symbols
  - [ ] `STARTUP_INTERVALS` matches requirements
  - [ ] `STARTUP_HIST_LIMIT` is reasonable (500 for prod, 200 for staging)

- [ ] **Frontend configuration is optimized**
  - [ ] `VITE_REFRESH_MS` is set (60000 for prod, 120000 for staging)
  - [ ] `VITE_WS_CONNECT_ON_START=false` (to avoid initial load spike)
  - [ ] `VITE_DISABLE_INITIAL_LOAD=true` (user-initiated data fetch)

- [ ] **Resilience settings are configured**
  - [ ] `AXIOS_MAX_RETRIES` is set (5 for prod, 3 for staging)
  - [ ] `BOOT_PRIMARY_ONLY=true` (for production reliability)
  - [ ] `BOOT_WINDOW_MS` is sufficient (180000 for prod)

---

### 4. Build & Docker

#### Docker Images

- [ ] **Backend image builds successfully**
  ```bash
  docker build -f Dockerfile.backend -t dreammaker-backend:latest .
  ```

- [ ] **Frontend image builds successfully**
  ```bash
  docker build -f Dockerfile.frontend -t dreammaker-frontend:latest .
  ```

- [ ] **Images are tagged appropriately**
  ```bash
  # Tag with version
  docker tag dreammaker-backend:latest dreammaker-backend:1.0.0
  docker tag dreammaker-frontend:latest dreammaker-frontend:1.0.0
  ```

- [ ] **Images are pushed to registry** (for remote deployment)
  ```bash
  docker push your-registry.com/dreammaker-backend:1.0.0
  docker push your-registry.com/dreammaker-frontend:1.0.0
  ```

#### Docker Compose

- [ ] **docker-compose.prod.yml is configured**
  - [ ] All environment variables are set
  - [ ] Volume mounts are correct
  - [ ] Port mappings are appropriate
  - [ ] Network configuration is valid

- [ ] **Compose stack starts locally**
  ```bash
  docker compose -f docker-compose.prod.yml up -d
  ```

- [ ] **All services are healthy**
  ```bash
  docker compose -f docker-compose.prod.yml ps
  # All services should show "healthy" status
  ```

- [ ] **Backend health check passes**
  ```bash
  curl -f http://localhost:8001/api/health
  ```

- [ ] **Frontend health check passes**
  ```bash
  curl -f http://localhost/health
  ```

---

### 5. Smoke Tests (Critical)

Run the production smoke test suite as defined in [PRODUCTION_SMOKE_TEST_PLAN.md](./PRODUCTION_SMOKE_TEST_PLAN.md).

#### Short Suite (Minimum Required)

- [ ] **Frontend loads successfully**
  - Open browser to application URL
  - Verify page loads without errors
  - Check browser console for errors

- [ ] **Navigation works**
  - [ ] Dashboard loads
  - [ ] Futures Scanner loads
  - [ ] Open Positions loads
  - [ ] Settings panel opens

- [ ] **Data policy is enforced**
  - [ ] Application mode shows "Online - Real Data"
  - [ ] No mock data warnings in console

- [ ] **Backend API is responsive**
  ```bash
  curl http://localhost:8001/api/health
  curl http://localhost:8001/api/system/metrics
  ```

- [ ] **WebSocket connection works**
  - Open DevTools Network tab
  - Check for WebSocket connection (ws:// or wss://)
  - Verify "connected" status in UI

#### Extended Suite (Recommended)

- [ ] **HF Data Engine integration**
  - [ ] Historical data loads for BTC
  - [ ] Error states are handled gracefully
  - [ ] Fallback behavior works if HF Engine is unavailable

- [ ] **Exchange integration**
  - [ ] Exchange status shows "Connected" or appropriate status
  - [ ] Trading mode is correct (OFF / DRY_RUN / TESTNET / LIVE)
  - [ ] No unauthorized API calls

- [ ] **Risk guards are active**
  - [ ] Max position size is enforced
  - [ ] Max leverage is capped
  - [ ] Account balance checks are working

- [ ] **UI error states**
  - [ ] Disconnect HF Engine → UI shows error state
  - [ ] Disconnect exchange → UI shows error state
  - [ ] Invalid API key → UI shows appropriate message

---

### 6. Observability & Monitoring

#### Logging

- [ ] **Log levels are appropriate**
  - Staging: `LOG_LEVEL=debug`
  - Production: `LOG_LEVEL=info`

- [ ] **Logs are accessible**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f
  docker logs dreammaker-backend
  docker logs dreammaker-frontend
  ```

- [ ] **No sensitive data in logs**
  - Review recent logs
  - Check for API keys, tokens, or credentials

#### Metrics (if enabled)

- [ ] **Metrics endpoint is accessible**
  ```bash
  curl http://localhost:8001/api/metrics
  ```

- [ ] **Key metrics are exposed**
  - HTTP request count
  - Response times
  - WebSocket connections
  - Data fetch success/failure rates

#### Health Checks

- [ ] **Backend health endpoint**
  ```bash
  curl http://localhost:8001/api/health
  # Should return 200 OK with status
  ```

- [ ] **Frontend health endpoint**
  ```bash
  curl http://localhost/health
  # Should return 200 OK
  ```

- [ ] **Uptime monitoring is configured** (optional but recommended)
  - Set up external monitoring service
  - Configure alerts for downtime

---

### 7. Security Hardening

#### Container Security

- [ ] **Containers run as non-root**
  ```bash
  docker exec dreammaker-backend whoami
  # Should NOT be "root"
  ```

- [ ] **Security headers are enabled**
  ```bash
  curl -I http://localhost/
  # Check for X-Frame-Options, X-Content-Type-Options, etc.
  ```

- [ ] **Rate limiting is active**
  - `RATE_LIMIT_ENABLED=true`
  - `RATE_LIMIT_MAX_REQUESTS` is set appropriately

#### Network Security

- [ ] **Firewall rules are configured**
  - Only necessary ports are exposed
  - Internal services are not publicly accessible

- [ ] **HTTPS is enabled** (production only)
  - SSL certificate is valid
  - HTTP redirects to HTTPS

- [ ] **CORS is configured properly**
  - Only allowed origins can access API

---

### 8. Rollback Plan

#### Backup Current State

- [ ] **Current version is documented**
  ```bash
  git describe --tags
  # Record current version/commit
  ```

- [ ] **Database/data is backed up**
  ```bash
  docker run --rm -v $(pwd)/data:/data -v $(pwd)/backup:/backup \
    alpine tar czf /backup/data-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
  ```

- [ ] **Previous Docker images are tagged and saved**
  ```bash
  docker tag dreammaker-backend:latest dreammaker-backend:previous
  docker tag dreammaker-frontend:latest dreammaker-frontend:previous
  ```

#### Rollback Procedure

- [ ] **Rollback steps are documented**
  1. Stop new deployment
  2. Pull previous images
  3. Start with previous configuration
  4. Verify services are healthy

- [ ] **Rollback can be executed quickly**
  ```bash
  # Example rollback script
  docker compose -f docker-compose.prod.yml down
  docker pull your-registry.com/dreammaker-backend:previous
  docker pull your-registry.com/dreammaker-frontend:previous
  docker compose -f docker-compose.prod.yml up -d
  ```

---

### 9. Deployment Execution

#### Pre-Deployment Communication

- [ ] **Team is notified** (if applicable)
  - Deployment time window
  - Expected downtime (if any)
  - Contact person for issues

- [ ] **Maintenance mode enabled** (optional)
  - Display maintenance page if needed
  - Redirect traffic if rolling update

#### Deployment Steps

- [ ] **Pull latest images**
  ```bash
  docker compose -f docker-compose.prod.yml pull
  ```

- [ ] **Stop old containers**
  ```bash
  docker compose -f docker-compose.prod.yml down
  ```

- [ ] **Start new containers**
  ```bash
  docker compose -f docker-compose.prod.yml up -d
  ```

- [ ] **Wait for services to be healthy**
  ```bash
  docker compose -f docker-compose.prod.yml ps
  # Wait until all services show "healthy"
  ```

- [ ] **Verify deployment**
  - Check health endpoints
  - Review logs for errors
  - Test key functionality

#### Post-Deployment Verification

- [ ] **All services are running**
  ```bash
  docker compose -f docker-compose.prod.yml ps
  ```

- [ ] **No errors in logs**
  ```bash
  docker compose -f docker-compose.prod.yml logs --tail=100
  ```

- [ ] **Smoke tests pass** (re-run short suite)
  - [ ] Frontend loads
  - [ ] Backend API responds
  - [ ] WebSocket connects
  - [ ] Key features work

---

### 10. Post-Deployment

#### Monitoring

- [ ] **Watch logs for 15 minutes**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f
  ```

- [ ] **Monitor resource usage**
  ```bash
  docker stats dreammaker-backend dreammaker-frontend
  ```

- [ ] **Check for errors or warnings**
  - Review application logs
  - Check error tracking service (if configured)

#### Documentation

- [ ] **Deployment is recorded**
  - Date/time of deployment
  - Version deployed (git commit/tag)
  - Who performed deployment
  - Any issues encountered

- [ ] **Update status page** (if applicable)
  - Mark deployment as complete
  - Update version number

- [ ] **Tag release in Git** (production only)
  ```bash
  git tag -a v1.0.0 -m "Production release v1.0.0"
  git push origin v1.0.0
  ```

#### Cleanup

- [ ] **Remove old images** (after confirming new deployment is stable)
  ```bash
  docker image prune -a -f
  ```

- [ ] **Clean up temporary files**
  ```bash
  rm -rf tmp/ .cache/
  ```

---

## Environment-Specific Notes

### Staging Deployment

**Key differences**:
- Use `env.staging`
- Testnet exchange endpoints
- More lenient error handling
- Can be redeployed frequently

**Checklist additions**:
- [ ] Staging database is fresh/clean
- [ ] Test data is loaded (if applicable)
- [ ] More verbose logging enabled

### Production Deployment

**Key differences**:
- Use `env.production`
- Mainnet exchange endpoints (REAL MONEY)
- Strict error handling
- Deploy only after thorough testing

**Checklist additions**:
- [ ] **CRITICAL**: Verify MAINNET endpoints
- [ ] **CRITICAL**: Confirm real credentials are correct
- [ ] **CRITICAL**: Risk limits are properly configured
- [ ] Deployment window is during low-traffic time
- [ ] Customer notification sent (if applicable)
- [ ] Backup deployment team member is available

---

## Troubleshooting Common Issues

### Deployment Fails

**Issue**: Container fails to start

**Steps**:
1. Check logs: `docker logs dreammaker-backend`
2. Verify environment variables: `docker exec dreammaker-backend env`
3. Check file permissions: `ls -la data/ config/`
4. Rollback if necessary

### Health Checks Fail

**Issue**: Services start but health checks fail

**Steps**:
1. Check backend: `curl http://localhost:8001/api/health`
2. Review logs for errors
3. Verify external dependencies (HF Engine, exchange)
4. Check network connectivity

### Data Loading Issues

**Issue**: Application can't load data from HF Engine

**Steps**:
1. Test HF Engine directly: `curl https://really-amin-datasourceforcryptocurrency.hf.space/health`
2. Check `HF_TOKEN` is valid
3. Review backend logs for API errors
4. Verify network/firewall settings

---

## Related Documentation

- [Runtime Profiles](./runtime-profiles.md) - Environment configuration details
- [Docker Deployment](./docker-deployment.md) - Docker build and run instructions
- [CI/CD Guide](./ci-cd.md) - Automated testing and building
- [Production Smoke Test Plan](./PRODUCTION_SMOKE_TEST_PLAN.md) - Detailed testing procedures
- [Logging and Observability](./logging-and-observability.md) - Monitoring and debugging
