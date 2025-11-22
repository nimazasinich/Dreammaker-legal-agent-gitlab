import React, { useEffect, useState } from 'react';
import { Logger } from '../../core/Logger.js';
import { Brain, TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react';
import { useTheme } from '../Theme/ThemeProvider';
import DatasourceClient from '../../services/DatasourceClient';
import { PredictionData } from '../../types';

interface AISignal {
  symbol: string;
  prediction: PredictionData;
  confidence: number;
  timestamp: number;
}


const logger = Logger.getInstance();

export const AISignalsScanner: React.FC = () => {
  const { theme } = useTheme();
  const [signals, setSignals] = useState<AISignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT']);

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;
    const abortController = new AbortController();
    
    const fetchSignals = async () => {
      if (!isMounted || abortController.signal.aborted) return;
      
      try {
        setIsLoading(true);
        
        // Fetch AI predictions using DatasourceClient
        const datasource = DatasourceClient.getInstance();
        let convertedSignals: AISignal[] = [];
        
        try {
          // Fetch predictions for selected symbols
          const symbolsToFetch = (selectedSymbols || []).map(s => s.replace('USDT', ''));
          const signalPromises = (symbolsToFetch || []).map(async (symbol) => {
            try {
              const aiPrediction = await datasource.getAIPrediction(symbol, '1h');
              
              if (aiPrediction && !abortController.signal.aborted) {
                const prediction: PredictionData = {
                  symbol: symbol,
                  prediction: aiPrediction.action === 'BUY' ? 'BULL' : 
                             aiPrediction.action === 'SELL' ? 'BEAR' : 'NEUTRAL',
                  confidence: aiPrediction.confidence || 0.5,
                  bullishProbability: aiPrediction.action === 'BUY' ? (aiPrediction.confidence || 0.5) : 0.33,
                  bearishProbability: aiPrediction.action === 'SELL' ? (aiPrediction.confidence || 0.5) : 0.33,
                  neutralProbability: aiPrediction.action === 'HOLD' ? (aiPrediction.confidence || 0.5) : 0.34,
                  timeframe: aiPrediction.timeframe || '1h',
                  timestamp: aiPrediction.timestamp || Date.now(),
                  riskScore: aiPrediction.confidence > 0.8 ? 0.2 : aiPrediction.confidence > 0.6 ? 0.5 : 0.8,
                  targetPrice: undefined,
                  stopLoss: undefined
                };
                
                return {
                  symbol: `${symbol}USDT`,
                  prediction,
                  confidence: aiPrediction.confidence || 0.5,
                  timestamp: aiPrediction.timestamp || Date.now(),
                };
              }
            } catch (err) {
              // Skip this symbol if prediction fails
              logger.warn(`Failed to fetch AI prediction for ${symbol}:`, err);
              return null;
            }
            return null;
          });
          
          const results = await Promise.all(signalPromises);
          convertedSignals = results.filter((s): s is AISignal => s !== null);
          
          if ((convertedSignals?.length || 0) > 0) {
            logger.info(`✅ Fetched ${convertedSignals.length} AI predictions from DatasourceClient`);
          }
        } catch (apiError) {
          logger.warn('Failed to fetch AI predictions:', apiError);
        }
        
        if (isMounted && !abortController.signal.aborted) {
          const limitedSignals = convertedSignals.slice(0, 100);
          setSignals(limitedSignals);
        }
      } catch (error) {
        if (!abortController.signal.aborted && isMounted) {
          logger.error('Failed to fetch AI signals:', {}, error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchSignals();
    
    // Set up interval
    interval = setInterval(() => {
      if (isMounted) {
        fetchSignals();
      }
    }, 30000); // Refresh every 30 seconds

    return () => {
      isMounted = false;
      abortController.abort();
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [selectedSymbols.join(',')]); // Use join to prevent array reference changes

  const getSignalColor = (signal: AISignal) => {
    const pred = signal.prediction.prediction;
    const isBullish = pred === 'BULL' || (pred as string) === 'BULLISH' || (pred as string) === 'UP';
    return isBullish ? 'text-green-400' : pred === 'NEUTRAL' ? 'text-gray-400' : 'text-red-400';
  };

  const getSignalBg = (signal: AISignal) => {
    const pred = signal.prediction.prediction;
    const isBullish = pred === 'BULL' || (pred as string) === 'BULLISH' || (pred as string) === 'UP';
    if (pred === 'NEUTRAL') {
      return theme === 'dark' ? 'bg-gray-900/20 border-gray-800/30' : 'bg-gray-50 border-gray-200';
    }
    return isBullish
      ? theme === 'dark' ? 'bg-green-900/20 border-green-800/30' : 'bg-green-50 border-green-200'
      : theme === 'dark' ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-blue-400" />
          <h3 className={`text-xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            AI Signals Scanner
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className={`w-4 h-4 ${
            isLoading ? 'animate-spin text-blue-400' : 'text-green-400'
          }`} />
          <span className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {isLoading ? 'Scanning...' : `${signals.length} signals active`}
          </span>
        </div>
      </div>

      {/* Signals Grid */}
      {isLoading && signals.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-body text-text-tertiary">
              Loading AI signals...
            </p>
          </div>
        </div>
      ) : signals.length === 0 ? (
        <div className={`${
          theme === 'dark' 
            ? 'bg-white/5 border-blue-800/30' 
            : 'bg-white/80 border-blue-200/50'
        } backdrop-blur-md rounded-xl p-8 border text-center`}>
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No AI signals found. Try selecting different symbols.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(signals || []).map((signal) => (
            <div
              key={signal.symbol}
              className={`${
                theme === 'dark' 
                  ? 'bg-white/10 border-blue-800/30' 
                  : 'bg-white/80 border-blue-200/50'
              } ${getSignalBg(signal)} backdrop-blur-md rounded-xl p-6 border transition-all hover:scale-105`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className={`text-lg font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {signal.symbol.replace('USDT', '').replace('/USDT', '')}
                  </h4>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {new Date(signal.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                {(() => {
                  const pred = signal.prediction.prediction;
                  const isBullish = pred === 'BULL' || (pred as string) === 'BULLISH' || (pred as string) === 'UP';
                  return isBullish ? (
                    <TrendingUp className="w-8 h-8 text-green-400" />
                  ) : pred === 'NEUTRAL' ? (
                    <Activity className="w-8 h-8 text-gray-400" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-400" />
                  );
                })()}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Signal
                  </span>
                  <span className={`font-bold ${getSignalColor(signal)}`}>
                    {signal.prediction.prediction === 'BULL' ? 'BULLISH' : 
                     signal.prediction.prediction === 'BEAR' ? 'BEARISH' : 
                     signal.prediction.prediction || 'NEUTRAL'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Confidence
                  </span>
                  <span className={`font-semibold ${
                    signal.confidence >= 0.7 ? 'text-green-400' :
                    signal.confidence >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {(signal.confidence * 100).toFixed(1)}%
                  </span>
                </div>

                {signal.prediction.targetPrice && (
                  <div className="flex items-center justify-between">
                    <span className={`${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Target Price
                    </span>
                    <span className={`font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      ${signal.prediction.targetPrice.toFixed(2)}
                    </span>
                  </div>
                )}

                {signal.prediction.stopLoss && (
                  <div className="flex items-center justify-between">
                    <span className={`${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Stop Loss
                    </span>
                    <span className={`font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      ${signal.prediction.stopLoss.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Confidence Bar */}
              <div className="mt-4">
                <div className={`w-full ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                } rounded-full h-2`}>
                  <div
                    className={`h-2 rounded-full transition-all ${
                      signal.confidence >= 0.7 ? 'bg-green-500' :
                      signal.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${signal.confidence * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
