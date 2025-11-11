// Environment configuration (works in both Vite frontend and Node backend)
// Single source of truth for API/WS bases with sanitizers

/**
 * Get environment variable (works in both Vite frontend and Node backend)
 */
const getEnv = (k: string) =>
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[k as any]
    ? String(import.meta.env[k as any] ?? '')
    : (typeof process !== 'undefined' ? process.env[k] : '') || '';

/**
 * API Base URL (must NOT end with /api)
 * Priority: VITE_API_BASE > VITE_API_URL > http://localhost:8001
 */
const rawApiBase =
  getEnv('VITE_API_BASE') ||
  (getEnv('VITE_API_URL') ? getEnv('VITE_API_URL').replace(/\/$/, '') : 'http://localhost:8001');

export const API_BASE = rawApiBase.replace(/\/api\/?$/i, ''); // strip trailing /api

/**
 * WebSocket Base URL (must be ws:// or wss:// and must NOT end with /ws or /api)
 * Priority: VITE_WS_BASE > VITE_WS_URL > derived from location > ws://localhost:8001
 */
const derivedWsBase =
  typeof location !== 'undefined' ? location.origin.replace(/^http/, 'ws') : 'ws://localhost:8001';

const rawWsBase = getEnv('VITE_WS_BASE') || getEnv('VITE_WS_URL') || derivedWsBase;

export const WS_BASE = rawWsBase.replace(/\/(ws|api)\/?$/i, ''); // strip trailing /ws or /api

/**
 * Disable polling when WebSocket is connected (WS-first approach)
 */
export const DISABLE_POLL_WHEN_WS = String(getEnv('VITE_DISABLE_POLL_WHEN_WS') || '1') === '1';

// Re-export data policy configuration
export {
  APP_MODE,
  STRICT_REAL_DATA,
  USE_MOCK_DATA,
  ALLOW_FAKE_DATA,
  assertPolicy,
  getDataSourceLabel,
  canUseSyntheticData,
  shouldUseMockFixtures,
  requiresRealData,
} from './dataPolicy';

// Telegram store secret for backend (server-side only, not accessible from frontend)
export const TELEGRAM_STORE_SECRET = typeof process !== 'undefined' ? process.env.TELEGRAM_STORE_SECRET || '' : '';

/**
 * Build WebSocket URL with proper base and path handling
 * Prevents /ws/ws duplication issues
 */
export function buildWebSocketUrl(path: string): string {
  // Normalize path to start with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Remove any existing /ws prefix from the path
  const cleanPath = normalizedPath.replace(/^\/ws/, '');
  // Combine WS_BASE with clean path
  return `${WS_BASE}${cleanPath}`;
}
