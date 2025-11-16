/**
 * useWebSocket - React Hook for WebSocket Manager
 * 
 * Provides easy-to-use React integration for the unified WebSocket manager.
 * Automatically handles subscription/unsubscription on mount/unmount.
 * 
 * Example usage:
 * ```tsx
 * const { data, isConnected, error } = useWebSocket('prices');
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { wsManager } from '../services/WebSocketManager';

interface UseWebSocketOptions<T = any> {
  /** Topic to subscribe to */
  topic: string;
  /** Whether to auto-connect (default: true) */
  enabled?: boolean;
  /** Optional data transformer */
  transform?: (data: any) => T;
  /** Optional error handler */
  onError?: (error: Error) => void;
}

interface UseWebSocketResult<T = any> {
  /** Latest data received */
  data: T | null;
  /** Connection status */
  isConnected: boolean;
  /** Error message if any */
  error: string | null;
  /** Manually reconnect */
  reconnect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
}

/**
 * Hook to subscribe to WebSocket messages for a specific topic
 */
export function useWebSocket<T = any>(
  options: UseWebSocketOptions<T> | string
): UseWebSocketResult<T> {
  // Allow simple string topic or full options object
  const opts: UseWebSocketOptions<T> = typeof options === 'string' 
    ? { topic: options, enabled: true }
    : { enabled: true, ...options };

  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reconnect = useCallback(() => {
    wsManager.disconnect();
    setTimeout(() => {
      wsManager.connect();
    }, 100);
  }, []);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, []);

  useEffect(() => {
    if (!opts.enabled) {
      return;
    }

    // Subscribe to messages
    const subscriptionId = wsManager.subscribe(opts.topic, (message) => {
      try {
        const transformed = opts.transform ? opts.transform(message) : message;
        setData(transformed);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to process message';
        setError(errorMsg);
        if (opts.onError) {
          opts.onError(err as Error);
        }
      }
    });

    // Subscribe to connection state
    const unsubscribeState = wsManager.onConnectionStateChange((connected) => {
      setIsConnected(connected);
    });

    // Cleanup on unmount
    return () => {
      wsManager.unsubscribe(subscriptionId);
      unsubscribeState();
    };
  }, [opts.topic, opts.enabled]);

  return {
    data,
    isConnected,
    error,
    reconnect,
    disconnect
  };
}

/**
 * Hook to get only connection status without subscribing to messages
 */
export function useWebSocketConnection(): Pick<UseWebSocketResult, 'isConnected' | 'reconnect' | 'disconnect'> {
  const [isConnected, setIsConnected] = useState(false);

  const reconnect = useCallback(() => {
    wsManager.disconnect();
    setTimeout(() => {
      wsManager.connect();
    }, 100);
  }, []);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, []);

  useEffect(() => {
    const unsubscribe = wsManager.onConnectionStateChange((connected) => {
      setIsConnected(connected);
    });

    return unsubscribe;
  }, []);

  return {
    isConnected,
    reconnect,
    disconnect
  };
}
