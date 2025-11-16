/**
 * Data Policy - Single Source of Truth
 *
 * This module enforces strict data usage rules across the entire application:
 * - Online mode: Real data only (no mock, no synthetic)
 * - Demo mode: Mock fixtures only (recorded, deterministic datasets)
 * - Test mode: Mock or synthetic (if explicitly allowed)
 */

export type AppMode = 'online' | 'demo' | 'test';

/**
 * Get environment variable (works in both Vite frontend and Node backend)
 */
function getEnv(key: string): string | undefined {
  // Frontend (Vite)
  if (typeof import.meta?.env !== 'undefined') {
    return import.meta.env[key];
  }
  // Backend (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

/**
 * Resolve application mode from environment variables
 * Defaults to 'online' if not specified or invalid
 */
export function resolveAppMode(): AppMode {
  const raw = getEnv('VITE_APP_MODE') || getEnv('APP_MODE') || 'online';
  if (raw === 'demo' || raw === 'test' || raw === 'online') {
    return raw;
  }
  return 'online';
}

/**
 * Application Mode (backward compatibility - uses resolveAppMode internally)
 * - online: Production mode with real data only
 * - demo: Demo mode with mock fixtures
 * - test: Test mode with flexible data sources
 */
export const APP_MODE: AppMode = resolveAppMode();

/**
 * Check if strict real data mode is enabled
 * Returns true in online mode, or if VITE_STRICT_REAL_DATA=true
 */
export function isStrictRealData(): boolean {
  const mode = resolveAppMode();
  if (mode === 'online') return true;
  return getEnv('VITE_STRICT_REAL_DATA') === 'true' || getEnv('STRICT_REAL_DATA') === 'true';
}

/**
 * Check if mock data can be used
 * Returns true in demo mode, or in test mode if VITE_USE_MOCK_DATA=true
 * Returns false in online mode
 */
export function canUseMockData(): boolean {
  const mode = resolveAppMode();
  if (mode === 'online') return false;
  if (mode === 'demo') return true;
  // test mode
  return getEnv('VITE_USE_MOCK_DATA') === 'true' || getEnv('USE_MOCK_DATA') === 'true';
}

/**
 * Check if synthetic data can be used
 * Returns true only in test mode if VITE_ALLOW_FAKE_DATA=true
 */
export function canUseSyntheticData(): boolean {
  const mode = resolveAppMode();
  if (mode !== 'test') return false;
  return getEnv('VITE_ALLOW_FAKE_DATA') === 'true' || getEnv('ALLOW_FAKE_DATA') === 'true';
}

/**
 * Strict Real Data Mode (backward compatibility)
 * When true: Only real data is allowed, fail fast on errors
 * When false: Allow fallbacks based on mode
 */
export const STRICT_REAL_DATA = isStrictRealData();

/**
 * Use Mock Data (backward compatibility)
 * When true: Use mock fixtures instead of real APIs
 * Automatically enabled in demo mode
 */
export const USE_MOCK_DATA = canUseMockData();

/**
 * Allow Fake/Synthetic Data (backward compatibility)
 * When true: Allow generation of synthetic data
 * Only allowed in test mode with explicit flag
 */
export const ALLOW_FAKE_DATA = canUseSyntheticData();

/**
 * Hard Guardrails - Policy Enforcement
 * Throws errors if policy is violated at startup
 */
export function assertPolicy(): void {
  const mode = resolveAppMode();
  const useMock = getEnv('VITE_USE_MOCK_DATA') === 'true' || getEnv('USE_MOCK_DATA') === 'true';
  const allowFake = getEnv('VITE_ALLOW_FAKE_DATA') === 'true' || getEnv('ALLOW_FAKE_DATA') === 'true';

  if (mode === 'online') {
    if (useMock || allowFake) {
      throw new Error(
        'Online mode requires STRICT_REAL_DATA and forbids mock/synthetic data. ' +
        'Set VITE_USE_MOCK_DATA=false and VITE_ALLOW_FAKE_DATA=false or change VITE_APP_MODE.'
      );
    }
  }
}

/**
 * Get data source label for UI display
 */
export function getDataSourceLabel(): string {
  if (APP_MODE === 'demo' || USE_MOCK_DATA) {
    return 'Mock (Demo)';
  }
  if (ALLOW_FAKE_DATA) {
    return 'Synthetic (Test Only)';
  }
  return 'Real';
}

/**
 * Check if mock fixtures should be used (backward compatibility)
 * @deprecated Use canUseMockData() instead
 */
export function shouldUseMockFixtures(): boolean {
  return canUseMockData();
}

/**
 * Check if only real data is allowed (backward compatibility)
 * @deprecated Use isStrictRealData() instead
 */
export function requiresRealData(): boolean {
  return isStrictRealData();
}

// Log policy configuration on module load
console.log('[DATA POLICY] Configuration:', {
  APP_MODE,
  STRICT_REAL_DATA,
  USE_MOCK_DATA,
  ALLOW_FAKE_DATA,
});
