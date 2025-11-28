/**
 * WebSocket Configuration
 *
 * DEPRECATED: This system now uses HTTP polling instead of WebSocket
 * 
 * MIXED MODE ARCHITECTURE:
 * - All real-time data is fetched via HTTP API calls
 * - Polling replaces WebSocket for market data updates
 * - This ensures stability and compatibility with all environments
 * - NO WebSocket connections are created by default
 */

/**
 * WebSocket is DISABLED by default in Mixed Mode
 * The system uses HTTP polling for real-time updates instead
 * @deprecated Use polling instead - see MixedModeDataService
 */
export const USE_LASTCHANCE_WS = false; // DISABLED - use HTTP polling

/**
 * Optional WebSocket authentication token
 * @deprecated WebSocket is disabled in Mixed Mode
 */
export const LASTCHANCE_WS_TOKEN: string | undefined = undefined;

/**
 * WebSocket reconnect configuration
 * @deprecated WebSocket is disabled in Mixed Mode
 */
export const WS_RECONNECT_DELAY_MS = 3000; // Not used - polling preferred
export const WS_MAX_RECONNECT_ATTEMPTS = 0; // No reconnection attempts

/**
 * POLLING CONFIGURATION (Replaces WebSocket)
 * These settings control the HTTP polling behavior for real-time data
 */
export const POLLING_ENABLED = true;
export const POLLING_INTERVAL_MS = 30000; // 30 seconds default
export const POLLING_MIN_INTERVAL_MS = 5000; // Minimum 5 seconds
export const POLLING_MAX_INTERVAL_MS = 120000; // Maximum 2 minutes

/**
 * Get polling configuration
 */
export const getPollingConfig = () => ({
  enabled: POLLING_ENABLED,
  intervalMs: POLLING_INTERVAL_MS,
  minIntervalMs: POLLING_MIN_INTERVAL_MS,
  maxIntervalMs: POLLING_MAX_INTERVAL_MS
});
