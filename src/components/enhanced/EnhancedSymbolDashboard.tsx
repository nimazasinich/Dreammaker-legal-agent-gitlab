import React, { useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Brain, Newspaper } from 'lucide-react';
import { DatasourceClient } from '../../services/DatasourceClient';
import NewsPanel from '../news/NewsPanel';
import { PriceChart } from '../market/PriceChart';
import ErrorStateCard from '../ui/ErrorStateCard';

type Props = { symbol: string; timeframe: string; hideBottomDuplicateSignals?: boolean };

export default function EnhancedSymbolDashboard({ symbol, timeframe, hideBottomDuplicateSignals = true }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bars, setBars] = React.useState<any[]>([]);
  const [news, setNews] = React.useState<any[]>([]);
  const [sent, setSent] = React.useState<any|null>(null);
  const [signals, setSignals] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string|null>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchOnce = React.useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const datasourceClient = DatasourceClient.getInstance();
      
      // Fetch data from DatasourceClient
      const [chartData, newsData, sentimentData, predictionData] = await Promise.all([
        datasourceClient.getPriceChart(symbol, timeframe, 500),
        datasourceClient.getLatestNews(20),
        datasourceClient.getMarketSentiment(),
        datasourceClient.getAIPrediction(symbol, timeframe)
      ]);
      
      // Convert chart data to bars format
      const bars = chartData.map((d: any) => ({
        time: d.timestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume
      }));
      
      // Convert news to expected format
      const news = newsData.map((item: any) => ({
        id: item.id || `news-${Date.now()}-${Math.random()}`,
        title: item.title,
        description: item.description,
        url: item.url,
        source: item.source,
        publishedAt: item.publishedAt
      }));
      
      // Convert sentiment data
      const sent = sentimentData ? {
        overall: sentimentData.fearGreedIndex || 50,
        fearGreedValue: sentimentData.fearGreedIndex || 50,
        label: sentimentData.classification || 'Neutral'
      } : null;
      
      // Convert prediction to signals format
      const signals = predictionData ? [{
        ts: predictionData.timestamp,
        symbol: predictionData.symbol,
        side: predictionData.action.toLowerCase(),
        score: predictionData.confidence,
        price: predictionData.price
      }] : [];
      
      setBars(bars);
      setNews(news);
      setSignals(signals);
      setSent(sent);
    } catch(e:any) {
      setErr(e?.message || 'load_failed');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  React.useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  // Clean symbol for display (remove USDT suffix)
  const displaySymbol = symbol.replace('USDT', '');

  // Get sentiment color and icon
  const getSentimentStyle = () => {
    if (!sent?.fearGreedValue) return { color: 'text-slate-400', bg: 'rgba(148, 163, 184, 0.2)', border: 'rgba(148, 163, 184, 0.3)' };
    const val = sent.fearGreedValue;
    if (val >= 75) return { color: 'text-emerald-400', bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.4)' };
    if (val >= 55) return { color: 'text-green-400', bg: 'rgba(34, 197, 94, 0.2)', border: 'rgba(34, 197, 94, 0.3)' };
    if (val >= 45) return { color: 'text-yellow-400', bg: 'rgba(234, 179, 8, 0.2)', border: 'rgba(234, 179, 8, 0.3)' };
    if (val >= 25) return { color: 'text-orange-400', bg: 'rgba(249, 115, 22, 0.2)', border: 'rgba(249, 115, 22, 0.3)' };
    return { color: 'text-red-400', bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.4)' };
  };

  return (
    <div className="space-y-6" aria-live="polite" aria-busy={loading ? 'true' : 'false'}>
      {/* Price Chart Section */}
      <div
        className="rounded-2xl overflow-hidden backdrop-blur-sm"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
        }}
      >
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <div
            className="p-2 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
            }}
          >
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white" style={{ textShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
              {displaySymbol}/USDT — {timeframe}
            </h3>
            <p className="text-[10px] text-slate-400">Real-time price chart</p>
          </div>
        </div>

        {/* DEFENSIVE UI: Premium Loading Skeleton */}
        {loading && (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 rounded-lg" style={{ background: 'rgba(139, 92, 246, 0.1)' }} />
              <div className="h-64 rounded-xl" style={{ 
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }} />
              <div className="flex gap-4">
                <div className="h-4 w-1/3 rounded" style={{ background: 'rgba(139, 92, 246, 0.1)' }} />
                <div className="h-4 w-1/4 rounded" style={{ background: 'rgba(139, 92, 246, 0.1)' }} />
              </div>
            </div>
          </div>
        )}

        {!loading && err && (
          <div className="p-6">
            <ErrorStateCard
              title="Chart data unavailable"
              message={err}
              onRetry={fetchOnce}
            />
          </div>
        )}

        {!loading && !err && (
          <PriceChart
            symbol={displaySymbol}
            autoFetch={false}
            initialTimeframe={timeframe}
          />
        )}
      </div>

      {/* Sentiment & Signals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Sentiment - VISUAL HIERARCHY */}
        {sent ? (
          <div
            className="group rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(99, 102, 241, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300"
                style={{
                  background: getSentimentStyle().bg,
                  border: `1px solid ${getSentimentStyle().border}`,
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.15)'
                }}
              >
                <Brain className={`w-5 h-5 ${getSentimentStyle().color}`} style={{
                  filter: 'drop-shadow(0 0 8px currentColor)'
                }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white" style={{
                  textShadow: '0 0 10px rgba(99, 102, 241, 0.3)'
                }}>Market Sentiment</h3>
                <p className="text-[10px] text-slate-400">Fear & Greed Index</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                {/* THE MOST IMPORTANT: Sentiment Value (Biggest & Boldest) */}
                <div className={`text-5xl sm:text-6xl font-extrabold ${getSentimentStyle().color} group-hover:scale-110 transition-all duration-500`} style={{
                  textShadow: '0 0 30px currentColor',
                  letterSpacing: '-0.03em'
                }}>
                  {sent?.fearGreedValue ?? sent?.overall ?? 50}
                </div>
                <div className="text-slate-500 text-xs mt-2 font-medium tracking-wide">/100</div>
              </div>
              <div
                className="px-5 py-3 rounded-xl transition-all duration-300 group-hover:scale-105"
                style={{
                  background: getSentimentStyle().bg,
                  border: `1px solid ${getSentimentStyle().border}`,
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.2)'
                }}
              >
                <span className={`text-base font-extrabold ${getSentimentStyle().color}`} style={{
                  textShadow: '0 0 10px currentColor'
                }}>
                  {sent?.label || 'Neutral'}
                </span>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-2xl p-6 animate-pulse" style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-slate-700/40 rounded-xl" />
              <div>
                <div className="h-4 w-32 bg-slate-700/40 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-700/30 rounded" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="h-14 w-20 bg-slate-700/50 rounded-lg" />
              <div className="h-10 w-24 bg-slate-700/40 rounded-xl" />
            </div>
          </div>
        ) : null}

        {/* Top Signals Summary - VISUAL HIERARCHY */}
        {(signals && signals.length > 0) ? (
          <div
            className="group rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.15)'
                }}
              >
                <TrendingUp className="w-5 h-5 text-purple-400" style={{
                  filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.8))'
                }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white" style={{
                  textShadow: '0 0 10px rgba(139, 92, 246, 0.3)'
                }}>Active Signals</h3>
                <p className="text-[10px] text-slate-400">{signals?.length || 0} signals detected</p>
              </div>
            </div>
            <div className="space-y-3">
              {(signals || []).slice(0, 3).map((sig: any, idx: number) => {
                // DEFENSIVE: Robust null handling
                const isBuy = sig?.side?.toLowerCase() === 'buy';
                const price = sig?.price ?? 0;
                const score = sig?.score ?? 0;
                
                return (
                <div
                  key={idx}
                  className="group/item flex items-center justify-between p-4 rounded-xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] hover:shadow-lg cursor-pointer"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                  }}
                >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isBuy ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`} style={{
                        border: isBuy ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
                      }}>
                        {isBuy ? (
                          <TrendingUp className="w-4 h-4 text-emerald-400 group-hover/item:translate-y-[-2px] transition-transform" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-rose-400 group-hover/item:translate-y-[2px] transition-transform" />
                        )}
                      </div>
                      <div>
                        <div className={`text-sm font-extrabold transition-all duration-300 ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`} style={{
                          textShadow: isBuy ? '0 0 10px rgba(52, 211, 153, 0.6)' : '0 0 10px rgba(251, 113, 133, 0.6)'
                        }}>
                          {sig?.side?.toUpperCase() || 'NEUTRAL'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5 transition-all duration-300">
                          ${price ? (typeof price === 'number' ? price.toFixed(4) : price) : '0.0000'}
                        </div>
                      </div>
                    </div>
                    {score != null && (
                      <div className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: 'rgb(196, 181, 253)',
                        border: '1px solid rgba(139, 92, 246, 0.3)'
                      }}>
                        {typeof score === 'number' ? score.toFixed(2) : score}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-2xl p-6 animate-pulse" style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.2)'
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-slate-700/40 rounded-xl" />
              <div>
                <div className="h-4 w-28 bg-slate-700/40 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-700/30 rounded" />
              </div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-700/20 rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-6 text-center" style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.2)'
          }}>
            <div className="inline-flex p-4 rounded-xl mb-3 animate-pulse" style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.2)'
            }}>
              <TrendingUp className="w-8 h-8 text-purple-400/50" />
            </div>
            <p className="text-slate-400 text-sm font-semibold">No signals available</p>
            <p className="text-slate-500 text-xs mt-1">Signals will appear when detected</p>
          </div>
        )}
      </div>

      {/* News Section - ULTIMATE POLISH */}
      <div
        className="group rounded-2xl p-6 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(6, 182, 212, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              boxShadow: '0 8px 24px rgba(6, 182, 212, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.15)'
            }}
          >
            <Newspaper className="w-5 h-5 text-cyan-400" style={{
              filter: 'drop-shadow(0 0 12px rgba(34, 211, 238, 0.8))'
            }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white" style={{ textShadow: '0 0 20px rgba(6, 182, 212, 0.3)' }}>
              Latest News — {displaySymbol || 'Market'}
            </h3>
            <p className="text-[10px] text-slate-400">Real-time institutional news feeds</p>
          </div>
        </div>
        <NewsPanel items={news || []} loading={loading} error={err} onRetry={fetchOnce} />
      </div>
    </div>
  );
}
