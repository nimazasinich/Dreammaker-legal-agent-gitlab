import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import { NewsItem } from '../../types';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, Minus, RefreshCw, AlertCircle } from 'lucide-react';
import DatasourceClient from '../../services/DatasourceClient';
import { showToast } from '../ui/Toast';

interface NewsFeedProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}


const logger = Logger.getInstance();

export const NewsFeed: React.FC<NewsFeedProps> = ({ 
  autoRefresh = true, 
  refreshInterval = 60000 // 1 minute
}) => {
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all');
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const datasource = DatasourceClient;
      const newsData = await datasource.getLatestNews(20);
      
      if (newsData && newsData.length > 0) {
        // Convert to NewsItem format
        const formattedNews: NewsItem[] = newsData.map((item: any, index: number) => {
          const sentimentScore = typeof item.sentiment_score === 'number' ? item.sentiment_score : 0;
          return {
            id: item.id || `news-${index}-${Date.now()}`,
            title: item.title || item.headline || 'No title',
            description: item.description || item.summary || item.content || '',
            url: item.url || item.link || '#',
            source: item.source || item.source_name || 'Unknown',
            publishedAt: item.publishedAt || item.published_at || item.timestamp || new Date().toISOString(),
            sentiment: item.sentiment || (sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral'),
            impact: item.impact || (Math.abs(sentimentScore) > 0.5 ? 'high' : Math.abs(sentimentScore) > 0.2 ? 'medium' : 'low')
          };
        });
        setNews(formattedNews);
      } else {
        setNews([]);
        showToast('warning', 'No News', 'No news articles available at the moment');
      }
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Failed to fetch news:', {}, error);
      setError('Failed to load news');
      setNews([]);
      showToast('error', 'News Fetch Failed', 'Failed to load news articles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();

    if (autoRefresh) {
      const interval = setInterval(fetchNews, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const filteredNews = filter === 'all' ? news : news.filter(item => item.sentiment === filter);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp size={16} className="text-green-400" />;
      case 'negative': return <TrendingDown size={16} className="text-red-400" />;
      default: return <Minus size={16} className="text-gray-400" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'border-green-500 bg-green-900/20';
      case 'negative': return 'border-red-500 bg-red-900/20';
      default: return 'border-gray-600 bg-gray-800';
    }
  };

  const getImpactBadge = (impact: string) => {
    const colors = {
      high: 'bg-red-600 text-white',
      medium: 'bg-yellow-600 text-white',
      low: 'bg-green-600 text-white'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[impact as keyof typeof colors]}`}>
        {impact.toUpperCase()}
      </span>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  };

  return (
    <div className="rounded-2xl p-6 backdrop-blur-sm transition-all duration-300" style={{
      background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(59, 130, 246, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
    }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
          }}>
            <Newspaper className="w-5 h-5 text-blue-400" style={{
              filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.8))'
            }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white" style={{
              textShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
            }}>Market News</h3>
            {loading && <p className="text-[10px] text-slate-400 animate-pulse">Fetching latest institutional news...</p>}
            {error && (
              <div className="mt-2 animate-fade-in">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-[1.01]" style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.2)'
                }}>
                  <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                  <span className="text-red-300 text-xs font-medium">{error || 'Failed to load news'}</span>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto p-1 rounded hover:bg-red-500/20 transition-all duration-200"
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
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchNews}
            disabled={loading}
            className="group p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh news"
            style={{
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.2)'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
          </button>
          <div className="flex gap-1.5">
          {['all', 'positive', 'negative', 'neutral'].map((sentiment) => (
            <button
              type="button"
              key={sentiment}
              onClick={() => setFilter(sentiment as 'all' | 'positive' | 'negative' | 'neutral')}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all duration-300 capitalize ${
                filter === sentiment
                  ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50 scale-105 shadow-lg'
                  : 'bg-slate-700/40 text-slate-400 border border-slate-600/30 hover:bg-slate-700/60 hover:scale-105'
              }`}
              style={{
                textShadow: filter === sentiment ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none'
              }}
            >
              {sentiment}
            </button>
          ))}
          </div>
        </div>
      </div>

      {loading && (!news || news.length === 0) ? (
        <div className="space-y-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="rounded-xl p-5 animate-pulse" style={{ 
              background: 'rgba(255, 255, 255, 0.03)', 
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
            }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 bg-slate-700/40 rounded"></div>
                  <div className="h-4 w-24 bg-slate-700/40 rounded"></div>
                  <div className="h-6 w-16 bg-slate-700/50 rounded-lg"></div>
                </div>
                <div className="h-3 w-20 bg-slate-700/30 rounded"></div>
              </div>
              <div className="h-6 bg-slate-700/50 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-slate-700/40 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-700/40 rounded w-5/6 mb-3"></div>
              <div className="h-3 bg-slate-700/30 rounded w-24"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-2 custom-scrollbar">
          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 3px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.3); border-radius: 3px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.5); }
          `}</style>
          {(filteredNews || []).map((item) => {
            // DEFENSIVE: Robust null handling
            const sentiment = item?.sentiment || 'neutral';
            const impact = item?.impact || 'low';
            const isPositive = sentiment === 'positive';
            const isNegative = sentiment === 'negative';
            
            return (
              <div
                key={item?.id || `news-${Math.random()}`}
                className="group relative rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer"
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
                    background: isPositive
                      ? 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 70%)'
                      : isNegative
                      ? 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.1) 0%, transparent 70%)'
                      : 'radial-gradient(circle at 50% 50%, rgba(148, 163, 184, 0.1) 0%, transparent 70%)',
                    zIndex: -1
                  }}
                />
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {getSentimentIcon(sentiment)}
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                        {item?.source || 'Unknown Source'}
                      </span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider" style={{
                      background: impact === 'high'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : impact === 'medium'
                        ? 'rgba(234, 179, 8, 0.2)'
                        : 'rgba(16, 185, 129, 0.2)',
                      color: impact === 'high'
                        ? 'rgb(251, 113, 133)'
                        : impact === 'medium'
                        ? 'rgb(251, 191, 36)'
                        : 'rgb(52, 211, 153)',
                      border: impact === 'high'
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : impact === 'medium'
                        ? '1px solid rgba(234, 179, 8, 0.3)'
                        : '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      {impact}
                    </div>
                  </div>
                  <span className="text-slate-500 text-[10px] font-medium">
                    {item?.publishedAt ? formatTimeAgo(item.publishedAt) : 'Unknown time'}
                  </span>
                </div>
                
                {/* Title - MOST IMPORTANT (Biggest & Boldest) */}
                <h4 className="text-white font-bold text-base sm:text-lg mb-3 leading-tight group-hover:text-blue-300 transition-all duration-300" style={{
                  textShadow: '0 0 10px rgba(255, 255, 255, 0.1)'
                }}>
                  {item?.title || 'No title available'}
                </h4>
                
                {/* Description - Secondary Info (Lighter) */}
                <p className="text-slate-400 text-xs sm:text-sm mb-4 leading-relaxed line-clamp-2">
                  {item?.description || 'No description available'}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      isPositive ? 'bg-emerald-400' :
                      isNegative ? 'bg-rose-400' : 'bg-slate-400'
                    }`} style={{
                      boxShadow: isPositive
                        ? '0 0 10px rgba(52, 211, 153, 0.6)'
                        : isNegative
                        ? '0 0 10px rgba(251, 113, 133, 0.6)'
                        : '0 0 10px rgba(148, 163, 184, 0.4)'
                    }}></div>
                    <span className={`text-xs font-semibold capitalize ${
                      isPositive ? 'text-emerald-400' :
                      isNegative ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {sentiment}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => window.open(item?.url || '#', '_blank')}
                    className="group/btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-blue-400 text-xs font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)'
                    }}
                  >
                    <span>Read More</span>
                    <ExternalLink size={12} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DEFENSIVE UI: Beautiful Empty State */}
      {!loading && (!filteredNews || filteredNews.length === 0) && (
        <div className="text-center py-12 animate-fade-in">
          <div className="inline-flex p-6 rounded-2xl mb-4 animate-pulse" style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.2)'
          }}>
            <Newspaper className="w-16 h-16 text-blue-400/50" style={{
              filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.4))'
            }} />
          </div>
          <p className="text-slate-400 font-bold text-lg mb-2" style={{
            textShadow: '0 0 10px rgba(59, 130, 246, 0.2)'
          }}>No news articles found</p>
          <p className="text-slate-500 text-sm mb-6">Try changing the filter or refresh to load new articles</p>
          <button
            onClick={fetchNews}
            disabled={loading}
            className="group px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 hover:scale-105 active:scale-95 transition-all duration-300 text-sm font-bold shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.2)'
            }}
          >
            <span className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
              <span className={loading ? 'opacity-70' : ''}>
                {loading ? 'Refreshing' : 'Refresh News'}
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};