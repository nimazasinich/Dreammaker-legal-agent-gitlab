/**
 * LiveDataContext
 * 
 * MIXED MODE ARCHITECTURE:
 * - NO WebSocket - uses HTTP polling for real-time updates
 * - HuggingFace as primary data source with fallbacks
 * - Automatic caching and on-demand data fetching
 * - Indicates data source for UI display
 * 
 * This replaces the previous WebSocket-based implementation with
 * a more reliable HTTP polling approach.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { MarketData, PredictionData } from '../types';
import { dataManager } from '../services/dataManager';
import { showToast } from './ui/Toast';
import { mixedModeDataService, MarketPrice, DataSourceNotification } from '../services/MixedModeDataService';
import { POLLING_ENABLED, POLLING_INTERVAL_MS } from '../config/ws';

interface LiveDataContextValue {
  // Market data
  marketData: Map<string, MarketData>;
  subscribeToMarketData: (symbols: string[], callback: (data: MarketData) => void) => () => void;
  
  // Signal updates
  signals: Map<string, PredictionData>;
  subscribeToSignals: (symbols: string[], callback: (data: any) => void) => () => void;
  
  // Health status
  health: any;
  subscribeToHealth: (callback: (data: any) => void) => () => void;
  
  // Connection status (now represents polling status, not WebSocket)
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  
  // NEW: Data source info for UI
  currentDataSource: string;
  dataSourceStatus: 'fresh' | 'cached' | 'stale' | 'fallback' | 'error';
  
  // NEW: Manual refresh
  refreshData: () => Promise<void>;
}

const LiveDataContext = createContext<LiveDataContextValue | undefined>(undefined);

export { LiveDataContext };

export const useLiveData = () => {
  const context = useContext(LiveDataContext);
  if (!context) {
    console.error('useLiveData must be used within LiveDataProvider');
  }
  return context;
};

interface LiveDataProviderProps {
  children: ReactNode;
}

export const LiveDataProvider: React.FC<LiveDataProviderProps> = ({ children }) => {
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());
  const [signals, setSignals] = useState<Map<string, PredictionData>>(new Map());
  const [health, setHealth] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentDataSource, setCurrentDataSource] = useState<string>('huggingface');
  const [dataSourceStatus, setDataSourceStatus] = useState<'fresh' | 'cached' | 'stale' | 'fallback' | 'error'>('fresh');
  
  // Track active subscriptions
  const activeSymbols = useRef<Set<string>>(new Set());
  const pollingCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Subscribe to data source notifications
    const unsubscribeNotifications = mixedModeDataService.onNotification((notification: DataSourceNotification) => {
      if (!isMounted) return;
      
      // Update source info
      setCurrentDataSource(notification.source);
      
      // Show toast for important notifications
      if (notification.type === 'error') {
        showToast('error', 'Data Source Error', notification.message);
      } else if (notification.type === 'warning' && notification.message.includes('fallback')) {
        showToast('warning', 'Using Fallback', notification.message);
      }
    });

    // Initialize polling status as "connected"
    // In Mixed Mode, we're always "connected" because we use HTTP polling
    setIsConnected(POLLING_ENABLED);
    console.log('✅ Mixed Mode initialized - Using HTTP polling (NO WebSocket)');

    return () => {
      isMounted = false;
      unsubscribeNotifications();
      
      // Stop any active polling
      if (pollingCleanup.current) {
        pollingCleanup.current();
        pollingCleanup.current = null;
      }
    };
  }, []);

  // Convert MarketPrice to MarketData format
  const convertToMarketData = (price: MarketPrice): MarketData => ({
    symbol: price.symbol + 'USDT',
    timestamp: new Date(price.lastUpdated).getTime(),
    open: price.price,
    high: price.price * 1.01,
    low: price.price * 0.99,
    close: price.price,
    volume: price.volume24h,
    price: price.price,
    change24h: price.change24h,
    changePercent24h: price.changePercent24h,
    interval: '1m'
  });

  const subscribeToMarketData = useCallback((symbols: string[], callback: (data: MarketData) => void) => {
    const MAX_MAP_SIZE = 100;
    
    // Add symbols to active set
    symbols.forEach(s => activeSymbols.current.add(s.toUpperCase().replace('USDT', '')));
    
    // Stop existing polling if any
    if (pollingCleanup.current) {
      pollingCleanup.current();
    }
    
    // Start polling using MixedModeDataService
    const allSymbols = Array.from(activeSymbols.current);
    
    pollingCleanup.current = mixedModeDataService.startPolling(
      allSymbols,
      (prices: MarketPrice[]) => {
        prices.forEach(price => {
          const marketDataItem = convertToMarketData(price);
          
          setMarketData(prev => {
            const updated = new Map(prev);
            updated.set(marketDataItem.symbol, marketDataItem);
            
            if (updated.size > MAX_MAP_SIZE) {
              const firstKey = updated.keys().next().value;
              if (firstKey) updated.delete(firstKey);
            }
            
            return updated;
          });
          
          // Update data source info
          setCurrentDataSource(price.source);
          setDataSourceStatus('fresh');
          
          // Call the callback for each symbol
          if (symbols.some(s => 
            marketDataItem.symbol.includes(s.toUpperCase().replace('USDT', ''))
          )) {
            callback(marketDataItem);
          }
        });
      },
      POLLING_INTERVAL_MS
    );

    // Return unsubscribe function
    return () => {
      // Remove symbols from active set
      symbols.forEach(s => activeSymbols.current.delete(s.toUpperCase().replace('USDT', '')));
      
      // If no more active symbols, stop polling
      if (activeSymbols.current.size === 0 && pollingCleanup.current) {
        pollingCleanup.current();
        pollingCleanup.current = null;
      }
    };
  }, []);

  const subscribeToSignals = useCallback((symbols: string[], callback: (data: any) => void) => {
    const MAX_MAP_SIZE = 50;
    
    // Use dataManager for signals (still uses internal mechanism)
    const unsubscribe = dataManager.subscribe('signal_update', symbols, (data: any) => {
      if (data && data.symbol) {
        setSignals(prev => {
          const updated = new Map(prev);
          updated.set(data.symbol, data.prediction || data);
          
          if (updated.size > MAX_MAP_SIZE) {
            const firstKey = updated.keys().next().value;
            if (firstKey) updated.delete(firstKey);
          }
          
          return updated;
        });
        callback(data);
      }
    });

    return unsubscribe;
  }, []);

  const subscribeToHealth = useCallback((callback: (data: any) => void) => {
    // Get health from MixedModeDataService stats
    const checkHealth = () => {
      const stats = mixedModeDataService.getStats();
      const healthData = {
        mode: stats.mode,
        primarySource: stats.primarySource,
        sources: stats.sources,
        requests: stats.requests,
        cacheSize: stats.cacheSize,
        timestamp: Date.now()
      };
      setHealth(healthData);
      callback(healthData);
    };
    
    // Check immediately
    checkHealth();
    
    // Check periodically
    const interval = setInterval(checkHealth, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);

  // Connect/Disconnect now control polling state
  const connect = useCallback(() => {
    setIsConnected(true);
    console.log('✅ Polling enabled');
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    
    // Stop all polling
    if (pollingCleanup.current) {
      pollingCleanup.current();
      pollingCleanup.current = null;
    }
    mixedModeDataService.stopAllPolling();
    console.log('⏸️ Polling disabled');
  }, []);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    const symbols = Array.from(activeSymbols.current);
    if (symbols.length === 0) return;
    
    try {
      const result = await mixedModeDataService.fetchMultipleMarketData(symbols, true);
      
      if (result.success && result.data) {
        result.data.forEach(price => {
          const marketDataItem = convertToMarketData(price);
          setMarketData(prev => {
            const updated = new Map(prev);
            updated.set(marketDataItem.symbol, marketDataItem);
            return updated;
          });
        });
        
        setCurrentDataSource(result.source);
        setDataSourceStatus(result.status);
        
        showToast('success', 'Data Refreshed', `Updated from ${result.source}`);
      }
    } catch (error) {
      showToast('error', 'Refresh Failed', (error as Error).message);
      setDataSourceStatus('error');
    }
  }, []);

  const value: LiveDataContextValue = {
    marketData,
    subscribeToMarketData,
    signals,
    subscribeToSignals,
    health,
    subscribeToHealth,
    isConnected,
    connect,
    disconnect,
    currentDataSource,
    dataSourceStatus,
    refreshData
  };

  return (
    <LiveDataContext.Provider value={value}>
      {children}
    </LiveDataContext.Provider>
  );
};

