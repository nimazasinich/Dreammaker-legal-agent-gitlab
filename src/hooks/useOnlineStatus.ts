/**
 * useOnlineStatus - Detect network connectivity
 *
 * Features:
 * - Monitors navigator.onLine
 * - Listens to online/offline events
 * - Returns current connection status
 * - Tracks connection state changes
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isOnline = useOnlineStatus();
 *
 *   if (!isOnline) {
 *     return <div>You are offline</div>;
 *   }
 *
 *   return <div>You are online</div>;
 * }
 * ```
 */

import { useState, useEffect } from 'react';
import { errorTracker } from '../lib/errorTracking';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => {
    // Initialize with current state
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true; // Default to online if not available
  });

  useEffect(() => {
    // Update state when connection status changes
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 Connection restored');

      // Track recovery
      errorTracker.trackRecovery('network', 'connection');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.warn('📴 Connection lost');

      // Track offline event
      errorTracker.track({
        type: 'network',
        message: 'Network connection lost',
        context: {
          component: 'useOnlineStatus',
          action: 'offline'
        }
      });
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default useOnlineStatus;
