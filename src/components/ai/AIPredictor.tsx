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
      const response = await DatasourceClient.getAIPrediction(symbol.replace('USDT', ''), '1h');
      
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
    <div className="rounded-2xl p-6 backdrop-blur-sm transition-all duration-300" style={{
      background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
    }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
          }}>
            <Brain className="w-5 h-5 text-purple-400" style={{
              filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.8))'
            }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white" style={{
              textShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
            }}>AI Predictions</h3>
            <p className="text-[10px] text-slate-400">Neural network forecasting</p>
          </div>
        </div>
        
        {error && (
          <div className="w-full mt-2 animate-fade-in">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-[1.01]" style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.2)'
            }}>
              <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
              <span className="text-red-300 text-xs font-medium flex-1">{error || 'Failed to load prediction'}</span>
              <button
                onClick={() => setError(null)}
                className="p-1 rounded hover:bg-red-500/20 transition-all duration-200"
                aria-label="Dismiss error"
              >
                <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
        
      <div className="flex items-center gap-2 mb-6">
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-300 focus:scale-105 focus:outline-none"
          style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.2)'
          }}
        >
          {(symbols || [selectedSymbol]).map(symbol => (
            <option key={symbol} value={symbol} className="bg-slate-900">{symbol}</option>
          ))}
        </select>
        {autoFetch && (
          <button
            type="button"
            onClick={() => fetchPrediction(selectedSymbol)}
            disabled={loading}
            className="group p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh prediction"
            style={{
              boxShadow: '0 4px 16px rgba(139, 92, 246, 0.2)'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
          </button>
        )}
      </div>

      {loading && !currentPrediction ? (
        <div className="space-y-6 animate-pulse">
          {/* Premium Skeleton */}
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-12 h-12 bg-slate-700/40 rounded-xl"></div>
              <div>
                <div className="h-8 w-32 bg-slate-700/50 rounded-lg mb-2"></div>
                <div className="h-6 w-40 bg-slate-700/40 rounded-lg"></div>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-5" style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div className="h-5 w-48 bg-slate-700/50 rounded-lg mb-4"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 w-20 bg-slate-700/40 rounded"></div>
                  <div className="h-4 w-16 bg-slate-700/40 rounded"></div>
                </div>
                <div className="w-full h-3 rounded-full" style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                }}>
                  <div className="h-3 bg-slate-700/50 rounded-full" style={{ width: `${i * 30}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : currentPrediction ? (
        <div className="space-y-6">
          {/* Main Prediction - VISUAL HIERARCHY: Most Important */}
          <div className="text-center py-8 rounded-2xl relative overflow-hidden" style={{
            background: currentPrediction?.prediction === 'BULL'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
              : currentPrediction?.prediction === 'BEAR'
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)'
              : 'linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(100, 116, 139, 0.1) 100%)',
            border: currentPrediction?.prediction === 'BULL'
              ? '1px solid rgba(16, 185, 129, 0.2)'
              : currentPrediction?.prediction === 'BEAR'
              ? '1px solid rgba(239, 68, 68, 0.2)'
              : '1px solid rgba(148, 163, 184, 0.2)',
            boxShadow: currentPrediction?.prediction === 'BULL'
              ? '0 0 40px rgba(16, 185, 129, 0.2)'
              : currentPrediction?.prediction === 'BEAR'
              ? '0 0 40px rgba(239, 68, 68, 0.2)'
              : '0 0 40px rgba(148, 163, 184, 0.1)'
          }}>
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-5 mb-6">
                <div className="transform hover:scale-110 transition-transform duration-300">
                  {getPredictionIcon(currentPrediction?.prediction || 'NEUTRAL')}
                </div>
                <div>
                  {/* THE MOST IMPORTANT: Prediction (Biggest & Boldest) */}
                  <div className="text-4xl font-extrabold text-white mb-2" style={{
                    textShadow: currentPrediction?.prediction === 'BULL'
                      ? '0 0 30px rgba(52, 211, 153, 0.5)'
                      : currentPrediction?.prediction === 'BEAR'
                      ? '0 0 30px rgba(251, 113, 133, 0.5)'
                      : '0 0 30px rgba(148, 163, 184, 0.3)',
                    letterSpacing: '-0.02em'
                  }}>
                    {currentPrediction?.prediction || 'NEUTRAL'}
                  </div>
                  {/* Secondary: Confidence */}
                  <div className={`text-xl font-bold ${getConfidenceColor(currentPrediction?.confidence ?? 0.5)}`} style={{
                    textShadow: '0 0 20px rgba(139, 92, 246, 0.4)'
                  }}>
                    {currentPrediction?.confidence ? (currentPrediction.confidence * 100).toFixed(1) : '50.0'}% Confidence
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Probability Distribution - SMOOTH TRANSITIONS */}
          <div className="rounded-xl p-5" style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
          }}>
            <h4 className="text-base font-bold text-white mb-4" style={{
              textShadow: '0 0 10px rgba(139, 92, 246, 0.2)'
            }}>Probability Distribution</h4>
            
            <div className="space-y-4">
              {/* Bullish */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-400" />
                    <span className="text-emerald-400 font-bold text-sm">Bullish</span>
                  </div>
                  <span className="text-white font-extrabold text-sm">
                    {currentPrediction?.bullishProbability ? (currentPrediction.bullishProbability * 100).toFixed(1) : '33.0'}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full relative overflow-hidden" style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                }}>
                  <div 
                    className="h-3 rounded-full transition-all duration-700 ease-out"
                    style={{ 
                      width: `${(currentPrediction?.bullishProbability ?? 0.33) * 100}%`,
                      background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.8) 0%, rgba(52, 211, 153, 1) 100%)',
                      boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)'
                    }}
                  ></div>
                </div>
              </div>

              {/* Bearish */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={14} className="text-rose-400" />
                    <span className="text-rose-400 font-bold text-sm">Bearish</span>
                  </div>
                  <span className="text-white font-extrabold text-sm">
                    {currentPrediction?.bearishProbability ? (currentPrediction.bearishProbability * 100).toFixed(1) : '33.0'}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full relative overflow-hidden" style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                }}>
                  <div 
                    className="h-3 rounded-full transition-all duration-700 ease-out"
                    style={{ 
                      width: `${(currentPrediction?.bearishProbability ?? 0.33) * 100}%`,
                      background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.8) 0%, rgba(251, 113, 133, 1) 100%)',
                      boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)'
                    }}
                  ></div>
                </div>
              </div>

              {/* Neutral */}
              <div className="group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Minus size={14} className="text-slate-400" />
                    <span className="text-slate-400 font-bold text-sm">Neutral</span>
                  </div>
                  <span className="text-white font-extrabold text-sm">
                    {currentPrediction?.neutralProbability ? (currentPrediction.neutralProbability * 100).toFixed(1) : '34.0'}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full relative overflow-hidden" style={{
                  background: 'rgba(148, 163, 184, 0.1)',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                }}>
                  <div 
                    className="h-3 rounded-full transition-all duration-700 ease-out"
                    style={{ 
                      width: `${(currentPrediction?.neutralProbability ?? 0.34) * 100}%`,
                      background: 'linear-gradient(90deg, rgba(148, 163, 184, 0.6) 0%, rgba(148, 163, 184, 0.9) 100%)',
                      boxShadow: '0 0 20px rgba(148, 163, 184, 0.4)'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Assessment - VISUAL FEEDBACK */}
          <div className="rounded-xl p-5" style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(234, 179, 8, 0.2)',
            boxShadow: '0 4px 16px rgba(234, 179, 8, 0.1)'
          }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-yellow-400" style={{
                  filter: 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.6))'
                }} />
                <span className="text-white font-bold text-sm">Risk Assessment</span>
              </div>
              <span className={`font-extrabold text-lg ${getRiskColor(currentPrediction?.riskScore ?? 0.3)}`} style={{
                textShadow: (currentPrediction?.riskScore ?? 0.3) <= 0.2
                  ? '0 0 15px rgba(52, 211, 153, 0.6)'
                  : (currentPrediction?.riskScore ?? 0.3) <= 0.3
                  ? '0 0 15px rgba(251, 191, 36, 0.6)'
                  : '0 0 15px rgba(251, 113, 133, 0.6)'
              }}>
                {currentPrediction?.riskScore ? (currentPrediction.riskScore * 100).toFixed(1) : '30.0'}%
              </span>
            </div>
            
            <div className="w-full h-3 rounded-full relative overflow-hidden" style={{
              background: 'rgba(255, 255, 255, 0.05)',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
            }}>
              <div 
                className="h-3 rounded-full transition-all duration-700 ease-out"
                style={{ 
                  width: `${(currentPrediction?.riskScore ?? 0.3) * 100}%`,
                  background: (currentPrediction?.riskScore ?? 0.3) <= 0.2
                    ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.8) 0%, rgba(52, 211, 153, 1) 100%)'
                    : (currentPrediction?.riskScore ?? 0.3) <= 0.3
                    ? 'linear-gradient(90deg, rgba(234, 179, 8, 0.8) 0%, rgba(251, 191, 36, 1) 100%)'
                    : 'linear-gradient(90deg, rgba(239, 68, 68, 0.8) 0%, rgba(251, 113, 133, 1) 100%)',
                  boxShadow: (currentPrediction?.riskScore ?? 0.3) <= 0.2
                    ? '0 0 20px rgba(16, 185, 129, 0.6)'
                    : (currentPrediction?.riskScore ?? 0.3) <= 0.3
                    ? '0 0 20px rgba(234, 179, 8, 0.6)'
                    : '0 0 20px rgba(239, 68, 68, 0.6)'
                }}
              ></div>
            </div>
          </div>

          {/* Trading Signal - PREMIUM DESIGN */}
          <div className="relative overflow-hidden rounded-xl p-5 transition-all duration-300 hover:scale-[1.02]" style={{
            background: (currentPrediction?.prediction === 'BULL'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)'
              : currentPrediction?.prediction === 'BEAR'
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(148, 163, 184, 0.15) 0%, rgba(100, 116, 139, 0.15) 100%)'),
            border: (currentPrediction?.prediction === 'BULL'
              ? '2px solid rgba(16, 185, 129, 0.4)'
              : currentPrediction?.prediction === 'BEAR'
              ? '2px solid rgba(239, 68, 68, 0.4)'
              : '2px solid rgba(148, 163, 184, 0.4)'),
            boxShadow: (currentPrediction?.prediction === 'BULL'
              ? '0 8px 32px rgba(16, 185, 129, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
              : currentPrediction?.prediction === 'BEAR'
              ? '0 8px 32px rgba(239, 68, 68, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
              : '0 8px 32px rgba(148, 163, 184, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)')
          }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-base mb-2" style={{
                  textShadow: '0 0 10px rgba(255, 255, 255, 0.2)'
                }}>Trading Signal</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Based on neural network analysis
                </div>
              </div>
              <div className="text-right">
                <div className={`font-extrabold text-2xl mb-1 ${
                  currentPrediction?.prediction === 'BULL' ? 'text-emerald-400' :
                  currentPrediction?.prediction === 'BEAR' ? 'text-rose-400' :
                  'text-slate-400'
                }`} style={{
                  textShadow: currentPrediction?.prediction === 'BULL'
                    ? '0 0 20px rgba(52, 211, 153, 0.8)'
                    : currentPrediction?.prediction === 'BEAR'
                    ? '0 0 20px rgba(251, 113, 133, 0.8)'
                    : '0 0 20px rgba(148, 163, 184, 0.5)',
                  letterSpacing: '-0.02em'
                }}>
                  {currentPrediction?.prediction === 'BULL' ? 'LONG' :
                   currentPrediction?.prediction === 'BEAR' ? 'SHORT' : 'HOLD'}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {currentPrediction?.timestamp ? new Date(currentPrediction.timestamp).toLocaleTimeString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // DEFENSIVE UI: Beautiful Empty State
        <div className="text-center py-16 animate-fade-in">
          <div className="inline-flex p-6 rounded-2xl mb-4 animate-pulse" style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            boxShadow: '0 0 40px rgba(139, 92, 246, 0.2)'
          }}>
            <Brain className="w-16 h-16 text-purple-400/50" style={{
              filter: 'drop-shadow(0 0 12px rgba(139, 92, 246, 0.4))'
            }} />
          </div>
          <p className="text-slate-400 font-bold text-lg mb-2" style={{
            textShadow: '0 0 10px rgba(139, 92, 246, 0.2)'
          }}>No AI predictions available</p>
          <p className="text-slate-500 text-sm mb-6">The neural network will analyze the market and generate predictions</p>
          {autoFetch && (
            <button
              onClick={() => fetchPrediction(selectedSymbol)}
              disabled={loading}
              className="group px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 hover:scale-105 transition-all duration-300 text-sm font-bold shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                boxShadow: '0 4px 16px rgba(139, 92, 246, 0.2)'
              }}
            >
              <span className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                {loading ? 'Analyzing...' : 'Generate Prediction'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};