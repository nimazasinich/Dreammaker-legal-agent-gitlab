# Runtime Profiles

This document explains the different runtime profiles available in the DreammakerCryptoSignalAndTrader application and how to use them.

## Overview

The application supports multiple runtime profiles to handle different deployment scenarios while maintaining the strict data policy requirements:

- **Mock/Demo Mode**: For development and UI testing without real data
- **Real Data Mode**: For local development with real data sources
- **Staging Mode**: For pre-production testing with real data in a controlled environment
- **Production Mode**: For live deployment with real data and hardened configuration

## Profiles

### 1. Mock/Demo Mode (`env.mock`)

**Purpose**: Local development and UI testing without consuming real API resources.

**Configuration**:
- `VITE_APP_MODE=demo`
- `VITE_STRICT_REAL_DATA=false`
- `VITE_USE_MOCK_DATA=true`
- `VITE_ALLOW_FAKE_DATA=false`

**Usage**:
```bash
npm run dev:mock
```

**Constraints**:
- ⚠️ NEVER use this profile for real trading
- Mock data only, no external API calls
- Limited to UI development and testing
- All trading features are disabled or simulated

---

### 2. Real Data Mode (`env.real`)

**Purpose**: Local development with real data sources for testing integrations and data flows.

**Configuration**:
- `VITE_APP_MODE=online`
- `VITE_STRICT_REAL_DATA=true`
- `VITE_USE_MOCK_DATA=false`
- `VITE_ALLOW_FAKE_DATA=false`
- Uses local backend: `http://localhost:8001`

**Usage**:
```bash
npm run dev:real
```

**Constraints**:
- Requires valid API keys (HF_TOKEN, etc.)
- Connects to real data sources (Hugging Face Engine, KuCoin)
- Should use testnet for exchange connections
- Not optimized for production load

---

### 3. Staging Mode (`env.staging`)

**Purpose**: Pre-production testing environment that mimics production but in a controlled, test-like setup.

**Configuration**:
- `VITE_APP_MODE=online`
- `VITE_STRICT_REAL_DATA=true`
- `VITE_USE_MOCK_DATA=false`
- `VITE_ALLOW_FAKE_DATA=false`
- `NODE_ENV=staging`
- Uses staging backend URL (must be configured)
- **TESTNET ONLY** for exchange connections

**Usage**:
```bash
npm run dev:staging
```

**Constraints**:
- Must use testnet/sandbox endpoints for all exchanges
- Requires valid API keys (inject via environment or secrets manager)
- Used for integration testing before production deployment
- Should mirror production configuration as closely as possible

**Key Differences from Production**:
- Uses testnet exchange endpoints (`api-sandbox-futures.kucoin.com`)
- May use different backend URLs for staging infrastructure
- More conservative settings (fewer watched symbols, etc.)

---

### 4. Production Mode (`env.production`)

**Purpose**: Live production deployment with real data and live trading capabilities.

**Configuration**:
- `VITE_APP_MODE=online`
- `VITE_STRICT_REAL_DATA=true`
- `VITE_USE_MOCK_DATA=false`
- `VITE_ALLOW_FAKE_DATA=false`
- `NODE_ENV=production`
- Uses production backend URL (must be configured)
- **MAINNET** exchange connections

**Usage**:
```bash
npm run dev:prod  # Local testing with production config
```

⚠️ **For actual production deployment, use Docker containers (see [docker-deployment.md](./docker-deployment.md))**

**Constraints**:
- ALL secrets must be injected via secure methods (vault, secrets manager, env vars)
- NEVER commit real secrets to version control
- Uses mainnet exchange endpoints (real money at risk)
- Requires production-grade infrastructure
- Must pass all smoke tests before deployment (see [PRODUCTION_SMOKE_TEST_PLAN.md](./PRODUCTION_SMOKE_TEST_PLAN.md))

**Production-Specific Settings**:
- More watched symbols and intervals
- Shorter refresh intervals (60s vs 120s)
- More retries (5 vs 3)
- Primary-only boot mode for reliability
- Redis enabled for caching
- Metrics and logging enabled

---

## Script Reference

### Development Scripts

| Command | Profile | Use Case |
|---------|---------|----------|
| `npm run dev` | Default (no env) | Quick local dev |
| `npm run dev:mock` | Mock/Demo | UI development without real APIs |
| `npm run dev:real` | Real Data | Local dev with real data sources |
| `npm run dev:staging` | Staging | Test staging configuration locally |
| `npm run dev:prod` | Production | Test production configuration locally |

### Client-Only Scripts

| Command | Profile | Use Case |
|---------|---------|----------|
| `npm run dev:client` | Default | Run only frontend |
| `npm run dev:client:mock` | Mock | Frontend with mock data |
| `npm run dev:client:real` | Real | Frontend with real backend |
| `npm run dev:client:staging` | Staging | Frontend with staging config |
| `npm run dev:client:prod` | Production | Frontend with production config |

### Server-Only Scripts

| Command | Profile | Use Case |
|---------|---------|----------|
| `npm run dev:server` | Default | Run only backend |
| `npm run dev:server:mock` | Mock | Backend with mock data |
| `npm run dev:server:real` | Real | Backend with real data |
| `npm run dev:server:staging` | Staging | Backend with staging config |
| `npm run dev:server:prod` | Production | Backend with production config |

---

## Environment File Structure

All environment files follow this structure:

```
env.{profile}
├── API Endpoints (VITE_API_BASE, VITE_WS_BASE)
├── Data Policy (VITE_APP_MODE, VITE_STRICT_REAL_DATA, etc.)
├── API Keys (HF_TOKEN, exchange keys, etc.)
├── Server Configuration (PORT, NODE_ENV)
├── Data Source Configuration (HF_ENGINE_BASE_URL, etc.)
├── Backend Configuration (watched symbols, intervals, etc.)
├── Frontend Configuration (refresh intervals, etc.)
├── Resilience Settings (retries, timeouts, etc.)
└── Exchange Configuration (KuCoin keys, base URLs)
```

---

## Security Best Practices

### For Staging and Production:

1. **Never commit secrets**: Use placeholders in committed env files
2. **Use secrets management**: Inject secrets via:
   - Environment variables at runtime
   - Secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Docker secrets
   - CI/CD secret injection

3. **Validate configuration**: Before deployment, run:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run build
   ```

4. **Test before production**: Always test in staging first with the exact configuration you'll use in production

---

## Migration Checklist

When moving between profiles:

- [ ] Update all API endpoints to match target environment
- [ ] Verify all required API keys are configured
- [ ] Confirm exchange endpoints (testnet vs mainnet)
- [ ] Check data policy settings match requirements
- [ ] Validate backend configuration (symbols, intervals)
- [ ] Test connectivity to all external services
- [ ] Run smoke tests for the target profile
- [ ] Review logs for any configuration warnings

---

## Troubleshooting

### Profile not working as expected?

1. **Check environment file**: Ensure the correct env file is being loaded
   ```bash
   # Verify environment variables are loaded
   echo $VITE_APP_MODE
   ```

2. **Validate API keys**: Check that all required keys are set and valid

3. **Check backend connectivity**: Ensure backend URL is reachable
   ```bash
   curl http://localhost:8001/api/health
   ```

4. **Review console logs**: Look for data policy violations or configuration errors

5. **Verify exchange endpoints**: Confirm testnet/mainnet endpoints match your intent

---

## Related Documentation

- [Data Policy and Real Data Manager](../README_FUTURES_ONLY.md)
- [Docker Deployment Guide](./docker-deployment.md)
- [Production Smoke Test Plan](./PRODUCTION_SMOKE_TEST_PLAN.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
