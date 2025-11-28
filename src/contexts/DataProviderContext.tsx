import React, { createContext, useContext, useState, useEffect } from 'react';
import { Logger } from '../core/Logger';

const logger = Logger.getInstance();

export type DataProviderMode = 'demo' | 'live';
export type DataProviderType = 'huggingface' | 'binance' | 'kucoin' | 'mixed';

interface DataProviderConfig {
  mode: DataProviderMode;
  provider: DataProviderType;
  isKuCoinReady: boolean;
  isBinanceEnabled: boolean;
}

interface DataProviderContextType {
  config: DataProviderConfig;
  setMode: (mode: DataProviderMode) => void;
  setProvider: (provider: DataProviderType) => void;
  canUseBinance: () => boolean;
  canUseKuCoin: () => boolean;
}

const DataProviderContext = createContext<DataProviderContextType | undefined>(undefined);

export const useDataProvider = () => {
  const context = useContext(DataProviderContext);
  if (!context) {
    throw new Error('useDataProvider must be used within DataProviderProvider');
  }
  return context;
};

interface DataProviderProviderProps {
  children: React.ReactNode;
}

export const DataProviderProvider: React.FC<DataProviderProviderProps> = ({ children }) => {
  // Check if KuCoin API keys are configured
  const isKuCoinReady = Boolean(
    import.meta.env.VITE_KUCOIN_API_KEY && 
    import.meta.env.VITE_KUCOIN_API_SECRET
  );

  // Default to Demo mode with Hugging Face
  const [config, setConfig] = useState<DataProviderConfig>({
    mode: 'demo',
    provider: 'huggingface', // Default to Hugging Face
    isKuCoinReady,
    isBinanceEnabled: false, // Disable Binance by default until KuCoin is ready
  });

  useEffect(() => {
    // If KuCoin is ready, enable Binance option
    if (isKuCoinReady) {
      setConfig(prev => ({ ...prev, isBinanceEnabled: true }));
      logger.info('KuCoin API configured - Binance integration enabled');
    } else {
      logger.info('Running in Demo mode with Hugging Face (KuCoin API not configured)');
    }
  }, [isKuCoinReady]);

  const setMode = (mode: DataProviderMode) => {
    setConfig(prev => {
      const newConfig = { ...prev, mode };
      
      // Switch provider based on mode
      if (mode === 'demo') {
        newConfig.provider = 'huggingface';
        logger.info('Switched to Demo mode - using Hugging Face');
      } else if (mode === 'live' && prev.isKuCoinReady) {
        newConfig.provider = 'mixed'; // Use mixed mode in live
        logger.info('Switched to Live mode - using mixed providers');
      } else if (mode === 'live' && !prev.isKuCoinReady) {
        logger.warn('Cannot switch to Live mode - KuCoin API not configured');
        return prev; // Don't switch if not ready
      }
      
      return newConfig;
    });
  };

  const setProvider = (provider: DataProviderType) => {
    // Prevent using Binance if not enabled
    if (provider === 'binance' && !config.isBinanceEnabled) {
      logger.warn('Binance is disabled until KuCoin API is configured');
      return;
    }
    
    setConfig(prev => ({ ...prev, provider }));
    logger.info(`Switched data provider to: ${provider}`);
  };

  const canUseBinance = () => {
    return config.isBinanceEnabled && config.isKuCoinReady;
  };

  const canUseKuCoin = () => {
    return config.isKuCoinReady;
  };

  const value: DataProviderContextType = {
    config,
    setMode,
    setProvider,
    canUseBinance,
    canUseKuCoin,
  };

  return (
    <DataProviderContext.Provider value={value}>
      {children}
    </DataProviderContext.Provider>
  );
};
