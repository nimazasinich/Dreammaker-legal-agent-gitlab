import React from 'react';
import { Brain, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock, RefreshCw } from 'lucide-react';

export interface Signal {
  id: string;
  symbol: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  timeframe: string;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  timestamp: number;
}

interface TopSignalsPanelProps {
  signals: Signal[];
  neuralNetworkAccuracy?: number;
  className?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

const TopSignalsPanel: React.FC<TopSignalsPanelProps> = ({ 
  signals, 
  neuralNetworkAccuracy = 85,
  className = '',
  loading = false,
  onRefresh
}) => {
  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'STRONG': return 'text-emerald-400';
      case 'MODERATE': return 'text-blue-400';
      case 'WEAK': return 'text-amber-400';
      default: return 'text-slate-400';
    }
  };

  const getStrengthBg = (strength: string) => {
    switch (strength) {
      case 'STRONG': return 'rgba(16, 185, 129, 0.15)';
      case 'MODERATE': return 'rgba(59, 130, 246, 0.15)';
      case 'WEAK': return 'rgba(251, 191, 36, 0.15)';
      default: return 'rgba(148, 163, 184, 0.15)';
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'BULLISH': return 'text-emerald-400';
      case 'BEARISH': return 'text-rose-400';
      case 'NEUTRAL': return 'text-slate-400';
      default: return 'text-slate-400';
    }
  };

  // DEFENSIVE: Sort signals by confidence and take top 3
  const topSignals = (signals || [])
    .sort((a, b) => (b?.confidence ?? 0) - (a?.confidence ?? 0))
    .slice(0, 3);

  // DEFENSIVE: Skeleton Loader
  if (loading && (!signals || signals.length === 0)) {
    return (
      <div className={`rounded-2xl p-6 backdrop-blur-sm ${className}`} style={{
        background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
      }}>
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-48 bg-slate-700/40 rounded animate-pulse" />
          <div className="h-5 w-20 bg-slate-700/30 rounded-full animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-xl animate-pulse" style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div className="h-5 w-24 bg-slate-700/40 rounded mb-3" />
              <div className="h-3 w-16 bg-slate-700/30 rounded mb-4" />
              <div className="h-2 w-full bg-slate-700/30 rounded-full mb-2" />
              <div className="h-4 w-16 bg-slate-700/40 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // DEFENSIVE: Empty State
  if (!signals || signals.length === 0) {
    return (
      <div className={`rounded-2xl p-6 backdrop-blur-sm ${className}`} style={{
        background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
      }}>
        <div className="text-center py-12">
          <div className="inline-flex p-5 rounded-2xl mb-4 animate-pulse" style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            boxShadow: '0 0 40px rgba(139, 92, 246, 0.2)'
          }}>
            <Brain className="w-12 h-12 text-purple-400/50" style={{
              filter: 'drop-shadow(0 0 12px rgba(139, 92, 246, 0.4))'
            }} />
          </div>
          <p className="text-slate-400 font-bold text-lg mb-2" style={{
            textShadow: '0 0 10px rgba(139, 92, 246, 0.2)'
          }}>No AI signals available</p>
          <p className="text-slate-500 text-sm">Neural network predictions will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${className}`} style={{
      background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
    }}>
      {/* Header - VISUAL HIERARCHY */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
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
            <h2 className="text-xl font-bold text-white" style={{
              textShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
            }}>
              Top 3 AI Signals
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Highest confidence • Neural network: {neuralNetworkAccuracy ?? 85}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50"
              title="Refresh signals"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
          }}>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{
              boxShadow: '0 0 10px rgba(52, 211, 153, 0.8)'
            }} />
            <span className="text-[10px] font-bold text-emerald-400" style={{
              textShadow: '0 0 10px rgba(52, 211, 153, 0.8)'
            }}>LIVE</span>
          </div>
        </div>
      </div>

      {/* Signals Grid - MICRO-INTERACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(topSignals || []).map((signal, index) => {
          // DEFENSIVE: Comprehensive null handling
          const direction = signal?.direction || 'NEUTRAL';
          const confidence = signal?.confidence ?? 0;
          const symbol = signal?.symbol || 'UNKNOWN';
          const timeframe = signal?.timeframe || '1h';
          const strength = signal?.strength || 'WEAK';
          const timestamp = signal?.timestamp || Date.now();
          const isBullish = direction === 'BULLISH';
          const isBearish = direction === 'BEARISH';

          return (
            <div
              key={signal?.id || `signal-${index}`}
              className="group relative p-5 rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] hover:shadow-2xl cursor-pointer overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.05)'
              }}
            >
              {/* Hover Glow Effect */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none"
                style={{
                  background: isBullish
                    ? 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 70%)'
                    : isBearish
                    ? 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.15) 0%, transparent 70%)'
                    : 'radial-gradient(circle at 50% 50%, rgba(148, 163, 184, 0.1) 0%, transparent 70%)',
                  zIndex: -1
                }}
              />

              {/* Signal Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-extrabold transition-all duration-300 group-hover:scale-110 ${getDirectionColor(direction)}`} style={{
                    textShadow: isBullish
                      ? '0 0 15px rgba(52, 211, 153, 0.6)'
                      : isBearish
                      ? '0 0 15px rgba(251, 113, 133, 0.6)'
                      : '0 0 10px rgba(148, 163, 184, 0.4)'
                  }}>
                    {symbol}
                  </span>
                  {isBullish ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                  ) : isBearish ? (
                    <ArrowDownRight className="w-4 h-4 text-rose-400 group-hover:translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                  ) : null}
                </div>
                <div className="w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-bold text-white group-hover:scale-110 transition-transform" style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.5)',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}>
                  #{index + 1}
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-300">{timeframe}</span>
                </div>
                <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{
                  background: getStrengthBg(strength),
                  color: getStrengthColor(strength).replace('text-', 'rgb(var(--')
                }}>
                  <span className={getStrengthColor(strength)}>{strength}</span>
                </div>
              </div>

              {/* Confidence Meter - VISUAL HIERARCHY */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Confidence</span>
                  <span className="text-base font-extrabold text-white group-hover:scale-110 transition-transform duration-300" style={{
                    textShadow: '0 0 15px rgba(255, 255, 255, 0.3)'
                  }}>
                    {(confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)'
                }}>
                  <div
                    className={`h-full rounded-full transition-all duration-1000 group-hover:animate-pulse ${
                      isBullish
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : isBearish
                        ? 'bg-gradient-to-r from-rose-500 to-rose-400'
                        : 'bg-gradient-to-r from-slate-500 to-slate-400'
                    }`}
                    style={{ 
                      width: `${Math.min(confidence * 100, 100)}%`,
                      boxShadow: isBullish
                        ? '0 0 10px rgba(16, 185, 129, 0.6)'
                        : isBearish
                        ? '0 0 10px rgba(239, 68, 68, 0.6)'
                        : '0 0 10px rgba(148, 163, 184, 0.4)'
                    }}
                  />
                </div>
              </div>

              {/* Footer - Direction Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-medium">
                  {new Date(timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <div className="px-3 py-1.5 rounded-lg transition-all duration-300 group-hover:scale-105" style={{
                  background: isBullish
                    ? 'rgba(16, 185, 129, 0.2)'
                    : isBearish
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(148, 163, 184, 0.2)',
                  border: isBullish
                    ? '1px solid rgba(16, 185, 129, 0.4)'
                    : isBearish
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : '1px solid rgba(148, 163, 184, 0.3)',
                  boxShadow: isBullish
                    ? '0 0 20px rgba(16, 185, 129, 0.3)'
                    : isBearish
                    ? '0 0 20px rgba(239, 68, 68, 0.3)'
                    : '0 0 15px rgba(148, 163, 184, 0.2)'
                }}>
                  <span className={`text-xs font-extrabold ${getDirectionColor(direction)}`} style={{
                    textShadow: isBullish
                      ? '0 0 10px rgba(52, 211, 153, 0.8)'
                      : isBearish
                      ? '0 0 10px rgba(251, 113, 133, 0.8)'
                      : 'none'
                  }}>
                    {direction}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-[10px] text-slate-500 flex-wrap gap-2">
          <span className="font-medium">
            Updated: {new Date().toLocaleTimeString('en-US')}
          </span>
          <span className="font-medium flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
            Signals powered by AI Neural Network
          </span>
        </div>
      </div>
    </div>
  );
};

export default TopSignalsPanel;
