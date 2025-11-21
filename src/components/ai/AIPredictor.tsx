import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import { PredictionData } from '../../types';
import { Brain, Target, TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';
import { dataManager } from '../../services/dataManager';
import DatasourceClient from '../../services/DatasourceClient';
import { showToast } from '../ui/Toast';

interface AIPredictorProps {
  predictions?: Record<string, PredictionData>;
  symbol?: string;
  autoFetch?: boolean;
  refreshInterval?: number;
}


const logger = Logger.getInstance();

export const AIPredictor: React.FC<AIPredictorProps> = ({ 
  predictions: propPredictions,
  symbol: propSymbol,
  autoFetch = false,
  refreshInterval = 60000 // 1 minute
}) => {
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState(propSymbol || 'BTC');
  const [predictions, setPredictions] = useState<Record<string, PredictionData>>(propPredictions || {});
  const [loading, setLoading] = useState(false);
  
  const currentPrediction = predictions[selectedSymbol];
  const symbols = Object.keys(predictions).length > 0 ? Object.keys(predictions) : [selectedSymbol];

  const fetchPrediction = async (symbol: string) => {
    setLoading(true);
    setError(null);
    try {
      const datasource = DatasourceClient.getInstance();
      const response = await datasource.getAIPrediction(symbol.replace('USDT', ''), '1h');
      
      if (response) {
        const prediction: PredictionData = {
          symbol: symbol.replace('USDT', ''),
          prediction: response.action === 'BUY' ? 'BULL' : response.action === 'SELL' ? 'BEAR' : 'NEUTRAL',
          confidence: response.confidence || 0.5,
          bullishProbability: response.action === 'BUY' ? response.confidence : 0.33,
          bearishProbability: response.action === 'SELL' ? response.confidence : 0.33,
          neutralProbability: response.action === 'HOLD' ? response.confidence : 0.34,
          timeframe: response.timeframe || '1h',
          timestamp: response.timestamp || Date.now(),
          riskScore: 0.3,
          targetPrice: response.price,
          stopLoss: undefined
        };

        setPredictions(prev => ({
          ...prev,
          [symbol.replace('USDT', '')]: prediction
        }));
        showToast('success', 'Prediction Updated', `AI prediction for ${symbol} updated successfully`);
      } else {
        showToast('warning', 'No Prediction', `No AI prediction available for ${symbol}`);
      }
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Failed to fetch AI prediction:', {}, error);
      setError('Failed to load prediction');
      showToast('error', 'Prediction Failed', 'Failed to fetch AI prediction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propPredictions) {
      setPredictions(propPredictions);
    }
  }, [propPredictions]);

  useEffect(() => {
    if (propSymbol) {
      setSelectedSymbol(propSymbol.replace('USDT', ''));
    }
  }, [propSymbol]);

  useEffect(() => {
    if (autoFetch && selectedSymbol) {
      fetchPrediction(selectedSymbol);
      
      if (refreshInterval > 0) {
        const interval = setInterval(() => {
          fetchPrediction(selectedSymbol);
        }, refreshInterval);
        return () => clearInterval(interval);
      }
    }
  }, [autoFetch, selectedSymbol, refreshInterval]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getRiskColor = (risk: number) => {
    if (risk <= 0.2) return 'text-green-400';
    if (risk <= 0.3) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPredictionIcon = (prediction: string) => {
    switch (prediction) {
      case 'BULL': return <TrendingUp className="text-green-400" size={24} />;
      case 'BEAR': return <TrendingDown className="text-red-400" size={24} />;
      default: return <Minus className="text-gray-400" size={24} />;
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Brain className="text-blue-400" size={28} />
          <h3 className="text-xl font-bold text-white">AI Predictions</h3>
        </div>
        {error && (
          <div className="mt-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <AlertCircle className="w-3 h-3 text-red-400" />
              <span className="text-red-300 text-xs">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto p-0.5 rounded hover:bg-red-500/20"
              >
                <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
        
        <div className="flex items-center gap-2">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            {(symbols || []).map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
          {autoFetch && (
            <button
              type="button"
              onClick={() => fetchPrediction(selectedSymbol)}
              disabled={loading}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-700 transition-colors disabled:opacity-50"
              title="Refresh prediction"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {loading && !currentPrediction ? (
        <div className="space-y-6 animate-pulse">
          {/* Main Prediction Skeleton */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="w-6 h-6 bg-slate-700/40 rounded"></div>
              <div>
                <div className="h-8 w-24 bg-slate-700/40 rounded mb-2"></div>
                <div className="h-6 w-32 bg-slate-700/30 rounded"></div>
              </div>
            </div>
          </div>
          {/* Probability Skeleton */}
          <div className="space-y-3">
            <div className="h-5 w-48 bg-slate-700/40 rounded mb-3"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-16 bg-slate-700/30 rounded"></div>
                  <div className="h-4 w-12 bg-slate-700/30 rounded"></div>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full">
                  <div className="h-2 bg-slate-700/40 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : currentPrediction ? (
        <div className="space-y-6">
          {/* Main Prediction */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 mb-4">
              {getPredictionIcon(currentPrediction.prediction)}
              <div>
                <div className="text-2xl font-bold text-white">
                  {currentPrediction.prediction}
                </div>
                <div className={`text-lg font-semibold ${getConfidenceColor(currentPrediction.confidence)}`}>
                  {(currentPrediction.confidence * 100).toFixed(1)}% Confidence
                </div>
              </div>
            </div>
          </div>

          {/* Probability Distribution */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-white mb-3">Probability Distribution</h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-green-400 font-medium">Bullish</span>
                <span className="text-white">{(currentPrediction.bullishProbability * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-green-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${currentPrediction.bullishProbability * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-red-400 font-medium">Bearish</span>
                <span className="text-white">{(currentPrediction.bearishProbability * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-red-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${currentPrediction.bearishProbability * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-medium">Neutral</span>
                <span className="text-white">{(currentPrediction.neutralProbability * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-gray-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${currentPrediction.neutralProbability * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={20} className="text-yellow-400" />
                <span className="text-white font-semibold">Risk Assessment</span>
              </div>
              <span className={`font-bold ${getRiskColor(currentPrediction.riskScore)}`}>
                {(currentPrediction.riskScore * 100).toFixed(1)}%
              </span>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  currentPrediction.riskScore <= 0.2 ? 'bg-green-400' :
                  currentPrediction.riskScore <= 0.3 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: `${currentPrediction.riskScore * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Trading Signal */}
          <div className={`p-4 rounded-lg border-2 ${
            currentPrediction.prediction === 'BULL' ? 'bg-green-900/20 border-green-500' :
            currentPrediction.prediction === 'BEAR' ? 'bg-red-900/20 border-red-500' :
            'bg-gray-800 border-gray-600'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white mb-1">Trading Signal</div>
                <div className="text-sm text-gray-400">
                  Based on current market conditions and AI analysis
                </div>
              </div>
              <div className={`text-right ${
                currentPrediction.prediction === 'BULL' ? 'text-green-400' :
                currentPrediction.prediction === 'BEAR' ? 'text-red-400' :
                'text-gray-400'
              }`}>
                <div className="font-bold text-lg">
                  {currentPrediction.prediction === 'BULL' ? 'LONG' :
                   currentPrediction.prediction === 'BEAR' ? 'SHORT' : 'HOLD'}
                </div>
                <div className="text-xs">
                  {new Date(currentPrediction.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-400 py-8">
          <Target size={48} className="mx-auto mb-4 opacity-50" />
          <p>Waiting for AI predictions...</p>
        </div>
      )}
    </div>
  );
};