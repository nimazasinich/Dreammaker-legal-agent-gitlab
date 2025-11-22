# CI/CD Pipeline Guide

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the DreammakerCryptoSignalAndTrader project.

## Overview

The project uses **GitHub Actions** for automated testing, linting, and building on every push and pull request. This ensures code quality and prevents broken builds from reaching production.

## CI Pipeline Architecture

```
┌─────────────┐
│ Git Push/PR │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  GitHub Actions Triggered   │
└──────────┬──────────────────┘
           │
           ├─────────────────┐
           │                 │
           ▼                 ▼
    ┌────────────┐    ┌────────────┐
    │ Build &    │    │   Docker   │
    │ Test Job   │    │ Build Test │
    └─────┬──────┘    └──────┬─────┘
          │                  │
          ├──────┬──────┬────┤
          │      │      │    │
          ▼      ▼      ▼    ▼
       Lint   Type   Test  Build
              Check        Images
```

## Workflow Configuration

### File Location

`.github/workflows/ci.yml`

### Trigger Events

The CI pipeline runs on:

- **Push** to branches:
  - `main`
  - `master`
  - `develop`
  - `cursor/**` (feature branches)

- **Pull Requests** targeting:
  - `main`
  - `master`
  - `develop`

### Jobs

#### 1. Build and Test Job

**Purpose**: Validate code quality, run tests, and build artifacts.

**Steps**:

1. **Checkout code**: Clone the repository
2. **Setup Node.js**: Install Node.js 20.x with npm cache
3. **Install dependencies**: Run `npm ci` for reproducible builds
4. **Lint**: Run `npm run lint` to check code style
5. **Type check**: Run `npm run typecheck` for TypeScript validation
6. **Test**: Run `npm test` to execute unit tests
7. **Build client**: Run `npm run build:client` (Vite frontend)
8. **Build server**: Run `npm run build:server` (TypeScript backend)
9. **Upload artifacts**: Save build artifacts for 7 days

**Configuration**:
- Runs on: `ubuntu-latest`
- Timeout: 15 minutes
- Node version: 20.x
- Fail on lint errors: Yes
- Continue on type check errors: Yes (informational only)

#### 2. Docker Build Job

**Purpose**: Verify Docker images can be built successfully.

**Steps**:

1. **Checkout code**: Clone the repository
2. **Setup Docker Buildx**: Configure Docker build environment
3. **Build backend image**: Build `Dockerfile.backend`
4. **Build frontend image**: Build `Dockerfile.frontend`

**Configuration**:
- Runs on: `ubuntu-latest`
- Timeout: 20 minutes
- Depends on: `build-and-test` job must pass first
- Push images: No (test only)
- Uses build cache: Yes (GitHub Actions cache)

---

## Running CI Steps Locally

Before pushing code, you can run the same checks locally to catch issues early:

### 1. Install Dependencies

```bash
npm ci
```

### 2. Run Lint

```bash
npm run lint
```

**Expected output**: No errors or warnings.

**Fix issues**:
```bash
# Some issues can be auto-fixed
npm run lint -- --fix
```

### 3. Run Type Check

```bash
npm run typecheck
```

**Expected output**: No type errors.

### 4. Run Tests

```bash
npm test
```

**Expected output**: All tests pass.

**Run specific tests**:
```bash
npm test -- RiskGuard
npm test -- TradeEngine
```

### 5. Build Client

```bash
npm run build:client
```

**Expected output**: Build completes successfully, `dist/` directory created.

### 6. Build Server

```bash
npm run build:server
```

**Expected output**: TypeScript compiled successfully, `dist/server.js` created.

### 7. Test Docker Builds

```bash
# Backend
docker build -f Dockerfile.backend -t dreammaker-backend:test .

# Frontend
docker build -f Dockerfile.frontend -t dreammaker-frontend:test .
```

**Expected output**: Both images build successfully without errors.

---

## Interpreting CI Results

### Success ✅

All jobs passed. The code is ready to merge or deploy.

Example output:
```
✓ build-and-test
  ✓ Lint
  ✓ Type check
  ✓ Test
  ✓ Build client
  ✓ Build server
✓ docker-build
  ✓ Build backend image
  ✓ Build frontend image
```

### Failure ❌

One or more jobs failed. Review the logs to identify the issue.

Common failures:

#### Lint Failure

**Symptom**: ESLint reports errors or warnings exceeding the limit.

**Solution**:
```bash
# View errors
npm run lint

# Auto-fix where possible
npm run lint -- --fix

# Manually fix remaining issues
```

#### Type Check Failure

**Symptom**: TypeScript compiler reports type errors.

**Solution**:
```bash
# View errors
npm run typecheck

# Fix type issues in reported files
# TypeScript errors must be fixed manually
```

#### Test Failure

**Symptom**: One or more unit tests fail.

**Solution**:
```bash
# Run tests locally
npm test

# Run specific failing test
npm test -- path/to/test.test.ts

# Fix the test or the code causing the failure
```

#### Build Failure

**Symptom**: Vite or TypeScript build fails.

**Solution**:
```bash
# Check for syntax errors
npm run lint

# Try building locally
npm run build

# Check for missing dependencies
npm ci
```

#### Docker Build Failure

**Symptom**: Docker image build fails.

**Solution**:
```bash
# Build locally to see detailed error
docker build -f Dockerfile.backend -t test .

# Common issues:
# - Missing files (check .dockerignore)
# - Incorrect COPY paths
# - Build script failures
```

---

## CI/CD Best Practices

### Before Pushing

1. **Run checks locally**: Execute lint, test, and build
2. **Fix all errors**: Don't rely on CI to catch issues
3. **Test incrementally**: Commit small, testable changes
4. **Review changes**: Use `git diff` before committing

### During Development

1. **Watch test mode**: Keep tests running in watch mode
   ```bash
   npm run test:watch
   ```

2. **Use linter in IDE**: Enable ESLint in your editor
3. **Type check on save**: Enable TypeScript checking in your editor
4. **Small commits**: Commit frequently with descriptive messages

### Pull Requests

1. **Wait for CI**: Never merge without passing CI
2. **Review logs**: Check CI output even if tests pass
3. **Fix warnings**: Address all linter warnings
4. **Update tests**: Add tests for new features

---

## CI Performance Optimization

### Caching

The CI uses aggressive caching to speed up builds:

- **npm cache**: Node modules cached by `setup-node` action
- **Docker cache**: Build layers cached using GitHub Actions cache

### Parallel Execution

Jobs run in parallel where possible:
- `docker-build` depends on `build-and-test`
- Lint, type check, and tests run sequentially within the job

### Timeout Protection

All jobs have timeouts to prevent hanging builds:
- `build-and-test`: 15 minutes
- `docker-build`: 20 minutes

---

## Adding New CI Steps

To add new checks to the CI pipeline:

### Example: Add Security Audit

Edit `.github/workflows/ci.yml`:

```yaml
- name: Security audit
  run: npm audit --production
  continue-on-error: true
```

### Example: Add E2E Tests

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E smoke tests
  run: npm run e2e:smoke
  env:
    CI: true
```

### Example: Add Code Coverage

```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

---

## CI for Different Branches

### Main/Master Branch

- Full CI suite runs
- Docker images are built and tested
- Can be extended to deploy to staging automatically

### Feature Branches (cursor/**)

- Same CI suite as main
- Helps catch issues before PR
- Encourages clean commits

### Pull Requests

- Full CI suite runs
- Must pass before merge is allowed
- Reviewers can see CI status

---

## Future Enhancements

### Planned CI Improvements

1. **Automated deployment**: Deploy to staging on main branch push
2. **Performance benchmarks**: Track build and test performance over time
3. **Visual regression testing**: Automated screenshot comparison
4. **Dependency updates**: Automated Dependabot PRs with CI validation
5. **Release automation**: Automatic versioning and changelog generation

### Deployment Pipeline (Not Yet Implemented)

Future CD pipeline will include:

```yaml
deploy-staging:
  needs: docker-build
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - name: Deploy to staging
      run: ./scripts/deploy-staging.sh

deploy-production:
  needs: deploy-staging
  runs-on: ubuntu-latest
  if: github.ref_type == 'tag'
  steps:
    - name: Deploy to production
      run: ./scripts/deploy-production.sh
```

---

## Troubleshooting CI Issues

### CI Hangs or Times Out

**Possible causes**:
- Infinite loop in code
- Test waiting for external resource
- Network request without timeout

**Solution**:
- Review recent code changes
- Check for hanging processes
- Add timeouts to all external calls

### CI Passes Locally But Fails in GitHub

**Possible causes**:
- Environment differences
- Missing or different dependencies
- Local cache hiding issues

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run lint && npm test && npm run build
```

### CI Fails with "out of memory" Error

**Possible causes**:
- Build process consuming too much memory
- Test suite has memory leaks

**Solution**:
- Increase Node memory limit in CI
- Optimize build process
- Fix memory leaks in tests

---

## Related Documentation

- [Runtime Profiles](./runtime-profiles.md) - Environment configuration
- [Docker Deployment](./docker-deployment.md) - Container deployment
- [Production Smoke Test Plan](./PRODUCTION_SMOKE_TEST_PLAN.md) - Manual testing
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Pre-deployment verification
