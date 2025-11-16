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
 * Detect if running in production or HuggingFace environment
 */
const isProduction = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;
const isHuggingFace = typeof location !== 'undefined' && location.hostname.includes('.hf.space');

/**
 * API Base URL (must NOT end with /api)
 * In production/HuggingFace: use empty string for relative paths
 * In development: use localhost:8001
 * Priority: VITE_API_BASE > VITE_API_URL > auto-detect
 */
const rawApiBase = (isProduction || isHuggingFace)
  ? (getEnv('VITE_API_BASE') || '') // Prefer env var, fallback to empty for relative paths
  : (getEnv('VITE_API_BASE') || getEnv('VITE_API_URL')?.replace(/\/$/, '') || 'http://localhost:8001');

export const API_BASE = rawApiBase.replace(/\/api\/?$/i, ''); // strip trailing /api

/**
 * WebSocket Base URL (must be ws:// or wss:// and must NOT end with /ws or /api)
 * In production/HuggingFace: derive from location.origin
 * In development: use ws://localhost:8001
 * Priority: VITE_WS_BASE > VITE_WS_URL > auto-detect
 * 
 * IMPORTANT: HuggingFace Spaces require WSS (secure WebSocket)
 */
const derivedWsBase = typeof location !== 'undefined' 
  ? location.origin.replace(/^http/, 'ws') // http -> ws, https -> wss
  : 'ws://localhost:8001';

const rawWsBase = (isProduction || isHuggingFace)
  ? (getEnv('VITE_WS_BASE') || derivedWsBase) // Prefer env var, fallback to auto-detect
  : (getEnv('VITE_WS_BASE') || getEnv('VITE_WS_URL') || 'ws://localhost:8001');

// Ensure WSS protocol for HuggingFace and HTTPS sites
let wsBase = rawWsBase.replace(/\/(ws|api)\/?$/i, ''); // strip trailing /ws or /api
if (isHuggingFace || (typeof location !== 'undefined' && location.protocol === 'https:')) {
  wsBase = wsBase.replace(/^ws:/, 'wss:'); // Force secure WebSocket
}

export const WS_BASE = wsBase;

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
