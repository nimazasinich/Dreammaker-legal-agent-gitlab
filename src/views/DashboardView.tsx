import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Logger } from '../core/Logger.js';
import {
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Wallet,
    Target,
    Brain,
    Activity,
    RefreshCw,
    AlertCircle,
    BarChart3
} from 'lucide-react';
import { MarketTicker } from '../components/market';
import { RealSignalFeedConnector } from '../components/connectors/RealSignalFeedConnector';
import { PriceChart } from '../components/market/PriceChart';
import TopSignalsPanel from '../components/TopSignalsPanel';
import { Signal } from '../components/TopSignalsPanel';
import { useData } from '../contexts/DataContext';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ResponseHandler from '../components/ui/ResponseHandler';
import EnhancedSymbolDashboard from '../components/enhanced/EnhancedSymbolDashboard';

interface MarketPrice {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    volume: string;
    volume24h?: number;
}

interface TopSignal {
    pair: string;
    symbol: string;
    prediction: string;
    confidence: number;
    timeframe: string;
    strength: string;
    timestamp?: number;
}

interface StatCard {
    label: string;
    value: string;
    change: string;
    subValue: string;
    positive: boolean;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
    iconGradient: string;
    glowColor: string;
}

interface PortfolioSummary {
    totalValue: number;
    totalChangePercent: number;
    dayPnL: number;
    dayPnLPercent: number;
    activePositions: number;
    totalPositions: number;
    balances?: Record<string, number>;
    positions?: Array<{
        symbol: string;
        quantity: number;
        entryPrice: number;
        currentPrice: number;
        unrealizedPnL: number;
    }>;
}

interface Position {
    symbol: string;
    quantity: number;
    entryPrice: number;
    currentPrice?: number;
    unrealizedPnL?: number;
    side: 'LONG' | 'SHORT';
}


const logger = Logger.getInstance();

export const DashboardView: React.FC = () => {
    // Use centralized data from DataContext
    const { 
        portfolio: portfolioData, 
        positions: positionsData, 
        prices: marketPricesData,
        signals: aiSignalsData,
        statistics: signalStatisticsData,
        metrics: trainingMetricsData,
        loading: dataLoading,
        error: dataError,
        refresh: refreshAllData,
        lastUpdate: dataLastUpdate
    } = useData();

    // Local state for UI
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioSummary>({
        totalValue: 0,
        totalChangePercent: 0,
        dayPnL: 0,
        dayPnLPercent: 0,
        activePositions: 0,
        totalPositions: 0
    });
    const [positions, setPositions] = useState<Position[]>([]);
    const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
    const [topSignals, setTopSignals] = useState<TopSignal[]>([]);
    const [aiSignalsCount, setAiSignalsCount] = useState(0);
    const [aiAccuracy, setAiAccuracy] = useState(0);
    const [trainingMetrics, setTrainingMetrics] = useState<any[]>([]);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [aiSignalsForPanel, setAiSignalsForPanel] = useState<Signal[]>([]);
    const [currentSymbol, setCurrentSymbol] = useState<string>('BTCUSDT');
    const [currentTimeframe, setCurrentTimeframe] = useState<string>('1h');

    // Initial data load on mount - consolidated to prevent duplicate requests
    const initialLoadRef = useRef(false);
    useEffect(() => {
        // Only trigger initial load once if we don't have data and we're not already loading
        // FIXED: Removed automatic refresh - data loads via DataContext
        if (!initialLoadRef.current) {
            initialLoadRef.current = true;
            logger.info('🔄 Dashboard: Mounted (data loads via context)');
            // Data will be loaded by DataContext, no need to trigger refresh here
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // Sync data from context to local state
    useEffect(() => {
        if (portfolioData) {
            setPortfolio(portfolioData);
        }
        if (positionsData && Array.isArray(positionsData)) {
            setPositions(positionsData);
        }
        if (marketPricesData && Array.isArray(marketPricesData)) {
            logger.info('💰 Processing prices:', { data: marketPricesData.length, type: 'prices found' });
            // Convert RealPriceData to MarketPrice format
            const formatted: MarketPrice[] = (marketPricesData || []).map((p: any) => ({
                symbol: `${p.symbol?.replace('USDT', '') || 'BTC'}/USDT`,
                price: p.price || 0,
                change: p.changePercent24h || p.change24h || 0,
                changePercent: p.changePercent24h || p.change24h || 0,
                volume: formatVolume(p.volume || p.volume24h || 0),
                volume24h: p.volume || p.volume24h || 0
            }));
            logger.info('✅ Formatted prices:', { data: formatted.slice(0, 3) });
            setMarketPrices(formatted);
        } else {
            logger.warn('⚠️ No prices data available:', marketPricesData);
        }
        if (aiSignalsData && Array.isArray(aiSignalsData)) {
            logger.info('📊 Processing signals:', { data: aiSignalsData.length, type: 'signals found' });
            setAiSignalsCount(aiSignalsData.length);
            
            // Filter and sort signals
            const validSignals = aiSignalsData.filter(s => s && (s.confidence || s.action));
            logger.info('✅ Valid signals:', { data: validSignals.length });
            
            if ((validSignals?.length || 0) > 0) {
                const top3 = validSignals
                    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
                    .slice(0, 3)
                    .map((s) => ({
                        pair: `${s.symbol?.replace('USDT', '') || 'BTC'}/USDT`,
                        symbol: s.symbol || 'BTCUSDT',
                        prediction: s.action === 'BUY' ? 'BULLISH' : s.action === 'SELL' ? 'BEARISH' : 'NEUTRAL',
                        confidence: Math.round((s.confidence || 0) * 100),
                        timeframe: s.timeframe || '1h',
                        strength: getStrength(s.confidence || 0),
                        timestamp: s.timestamp || Date.now()
                    }));
                logger.info('🎯 Top 3 signals:', { data: top3 });
                setTopSignals(top3);
            } else {
                setTopSignals([]);
            }
        } else {
            logger.info('⚠️ No signals data available:', { data: aiSignalsData });
            setTopSignals([]);
        }
        if (signalStatisticsData) {
            const accuracy = signalStatisticsData.accuracy || signalStatisticsData.winRate || 0;
            setAiAccuracy(Math.round(accuracy * 100));
        }
        if (trainingMetricsData && Array.isArray(trainingMetricsData)) {
            setTrainingMetrics(trainingMetricsData);
            if ((trainingMetricsData?.length || 0) > 0) {
                const latest = trainingMetricsData[0];
                if (latest.accuracy?.directional) {
                    setAiAccuracy(Math.round(latest.accuracy.directional * 100));
                }
            }
        }
        if (dataLastUpdate) {
            setLastUpdate(dataLastUpdate);
        }
        if (dataError) {
            setError(dataError);
        }
    }, [portfolioData, positionsData, marketPricesData, aiSignalsData, signalStatisticsData, trainingMetricsData, dataLastUpdate, dataError]);

    // Update current symbol when market prices change
    useEffect(() => {
        if ((marketPrices?.length || 0) > 0 && marketPrices[0]?.symbol) {
            const symbol = marketPrices[0].symbol.replace('/', '');
            setCurrentSymbol(symbol);
        }
    }, [marketPrices]);

    // Use signals from DataContext instead of separate polling
    // This prevents duplicate HTTP requests
    useEffect(() => {
        if (aiSignalsData && Array.isArray(aiSignalsData)) {
            // Use signals from context
            setAiSignalsForPanel(aiSignalsData.slice(0, 10));
        }
    }, [aiSignalsData]);

    // Handle manual refresh - prevent duplicate calls
    const handleRefresh = useCallback(() => {
        if (isRefreshing || dataLoading) {
            return; // Already refreshing, skip
        }
        setIsRefreshing(true);
        refreshAllData();
        setTimeout(() => setIsRefreshing(false), 1000);
    }, [refreshAllData, isRefreshing, dataLoading]);

    // Helper functions (OPTIMIZED: Memoized with useCallback)
    const formatVolume = useCallback((volume: number): string => {
        if (!volume) return '0';
        if (volume >= 1000000000) return `${(volume / 1000000).toFixed(1)}B`;
        if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
        if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
        return volume.toFixed(0);
    }, []);

    const getStrength = useCallback((confidence: number): string => {
        if (confidence >= 0.85) return 'STRONG';
        if (confidence >= 0.70) return 'MODERATE';
        return 'WEAK';
    }, []);

    // Calculate derived values
    const portfolioValue = portfolioData ? (portfolio?.totalValue ?? 0) : undefined;
    const portfolioChange = portfolio?.totalChangePercent ?? 0;
    const activePositions = portfolio?.activePositions || positions.length;
    const dayPnL = portfolio?.dayPnL || 0;
    const dayPnLPercent = portfolio?.dayPnLPercent || 0;
    const totalPositions = portfolio?.totalPositions || positions.length;
    
    // Calculate new positions today (could be enhanced with date tracking)
    const newPositionsToday = positions.filter(p => {
        // This would ideally check if position was created today
        return true; // Placeholder
    }).length;

    // Calculate 7-day PnL 
    // Note: This requires historical portfolio data tracking. 
    // For now, using daily PnL as approximation. 
    // To implement: Store daily portfolio snapshots and calculate difference over 7 days.
    const weekPnL = dayPnL * 7; // Approximation: assumes daily PnL average over 7 days

    // Calculate active AI models from training metrics
    const aiActiveModels = (trainingMetrics?.length || 0) > 0 ? 1 : 0;

    // Loading state from context
    const loading = dataLoading;

    // Update positions with current prices
    useEffect(() => {
        if ((positions?.length || 0) > 0 && (marketPrices?.length || 0) > 0) {
            const updatedPositions = (positions || []).map(pos => {
                const marketPrice = marketPrices.find(mp => 
                    mp.symbol.includes(pos.symbol.replace('USDT', ''))
                );
                if (marketPrice) {
                    return {
                        ...pos,
                        currentPrice: marketPrice.price,
                        unrealizedPnL: pos.side === 'LONG' 
                            ? (marketPrice.price - pos.entryPrice) * pos.quantity
                            : (pos.entryPrice - marketPrice.price) * pos.quantity
                    };
                }
                return pos;
            });
            // Only update if there are actual changes
            const hasChanges = updatedPositions.some((up, idx) => {
                const orig = positions[idx];
                return !orig || 
                       up.currentPrice !== orig.currentPrice ||
                       up.unrealizedPnL !== orig.unrealizedPnL;
            });
            if (hasChanges) {
                setPositions(prev => {
                    // Deep comparison to prevent infinite loops
                    const positionsChanged = prev.length !== updatedPositions.length ||
                        prev.some((p, i) => 
                            p.symbol !== updatedPositions[i]?.symbol ||
                            p.currentPrice !== updatedPositions[i]?.currentPrice
                        );
                    return positionsChanged ? updatedPositions : prev;
                });
            }
        }
    }, [marketPrices]); // Removed positions from deps to prevent infinite loop

    const portfolioChangeAmount = portfolioValue !== undefined ? (portfolioValue * portfolioChange) / 100 : 0;

    const statCards: StatCard[] = [
        {
            label: 'Total Portfolio',
            value: portfolioData && portfolioValue !== undefined 
                ? `$${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                : (loading ? '' : '$0.00'),
            change: portfolioData && portfolioChange !== undefined 
                ? `${portfolioChange >= 0 ? '+' : ''}${portfolioChange.toFixed(2)}%` 
                : '0.00%',
            subValue: portfolioData && portfolioChangeAmount !== undefined 
                ? `${portfolioChange >= 0 ? '+' : ''}$${Math.abs(portfolioChangeAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                : '$0.00',
            positive: portfolioChange >= 0,
            icon: Wallet,
            gradient: 'from-blue-500/20 via-blue-600/10 to-cyan-500/20',
            iconGradient: 'from-blue-400 to-cyan-400',
            glowColor: '59, 130, 246'
        },
        {
            label: 'Active Positions',
            value: activePositions.toString(),
            change: `+${newPositionsToday} today`,
            subValue: `${totalPositions} total positions`,
            positive: true,
            icon: Target,
            gradient: 'from-emerald-500/20 via-emerald-600/10 to-teal-500/20',
            iconGradient: 'from-emerald-400 to-teal-400',
            glowColor: '16, 185, 129'
        },
        {
            label: '24h P&L',
            value: `${dayPnL >= 0 ? '+' : ''}$${Math.abs(dayPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${dayPnLPercent >= 0 ? '+' : ''}${dayPnLPercent.toFixed(2)}%`,
            subValue: `7d: ${weekPnL >= 0 ? '+' : ''}$${weekPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            positive: dayPnL >= 0,
            icon: dayPnL >= 0 ? TrendingUp : TrendingDown,
            gradient: dayPnL >= 0 ? 'from-green-500/20 via-green-600/10 to-emerald-500/20' : 'from-red-500/20 via-red-600/10 to-rose-500/20',
            iconGradient: dayPnL >= 0 ? 'from-green-400 to-emerald-400' : 'from-red-400 to-rose-400',
            glowColor: dayPnL >= 0 ? '34, 197, 94' : '239, 68, 68'
        },
        {
            label: 'AI Signals',
            value: aiSignalsCount.toString(),
            change: `${aiAccuracy}% accuracy`,
            subValue: `${aiActiveModels} models active`,
            positive: true,
            icon: Brain,
            gradient: 'from-purple-500/20 via-purple-600/10 to-violet-500/20',
            iconGradient: 'from-purple-400 to-violet-400',
            glowColor: '139, 92, 246'
        },
    ];

    if (loading && portfolioValue === 0) {
        return (
            <div className="w-full min-h-full animate-fade-in flex items-center justify-center">
                <ErrorBoundary>
                    <div className="text-center">
                        <LoadingSpinner size="large" />
                        <p className="text-slate-400 mt-4">Loading dashboard data...</p>
                    </div>
                </ErrorBoundary>
            </div>
        );
    }

    return (
        <div className="w-full min-h-full animate-fade-in">
            {/* Market Ticker - Uses data from context, no separate fetching */}
            <div className="mb-6">
                <MarketTicker marketData={marketPrices.map(mp => ({
                    symbol: mp.symbol.replace('/', ''),
                    price: mp.price,
                    open: mp.price,
                    high: mp.price,
                    low: mp.price,
                    close: mp.price,
                    change24h: mp.changePercent,
                    changePercent24h: mp.changePercent,
                    volume: mp.volume24h || 0,
                    timestamp: Date.now()
                }))} autoFetch={false} />
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }
                
                .animate-shimmer {
                    animation: shimmer 8s infinite linear;
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        rgba(255, 255, 255, 0.03) 50%,
                        transparent 100%
                    );
                    background-size: 1000px 100%;
                }
            `}</style>

            {/* Header - Compact and Clean */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Dashboard Overview
                        </h1>
                        <p className="text-slate-400 text-xs mt-1">Real-time market intelligence and portfolio analytics</p>
                        {error && (
                            <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                <AlertCircle className="w-3 h-3 text-orange-400" />
                                <span className="text-orange-400 text-xs">{error}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                autoRefresh 
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
                                    : 'bg-slate-700/40 text-slate-400 border border-slate-600/30 hover:bg-slate-700/60'
                            }`}
                            title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
                        >
                            {autoRefresh ? '● Auto' : '○ Manual'}
                        </button>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing || dataLoading}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                            title="Refresh data"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                        <div 
                            className="px-3 py-1.5 rounded-lg backdrop-blur-sm"
                            style={{
                                background: 'rgba(15, 15, 24, 0.6)',
                                border: '1px solid rgba(100, 100, 120, 0.2)',
                            }}
                        >
                            <span className="text-[10px] text-slate-500 mr-1.5">Updated:</span>
                            <span className="text-xs font-medium text-slate-300">{lastUpdate.toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid - Improved spacing and responsiveness */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {(statCards || []).map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={`stat-${stat.label}-${index}`}
                            className="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.03]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: `0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(${stat.glowColor}, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)`
                            }}
                        >
                            {/* Gradient overlay */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-100`} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                            <div
                                className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl"
                                style={{
                                    background: `radial-gradient(circle at 50% 50%, rgba(${stat.glowColor}, 0.3) 0%, transparent 70%)`,
                                    zIndex: -1
                                }}
                            />

                            <div className="relative z-10 p-6">
                                {/* Icon */}
                                <div
                                    className="inline-flex p-3 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-500"
                                    style={{
                                        background: `linear-gradient(135deg, ${stat.gradient})`,
                                        boxShadow: `0 12px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(${stat.glowColor}, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.25)`
                                    }}
                                >
                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-white/30" />
                                    <Icon className="w-6 h-6 text-white relative z-10" />
                                </div>

                                {/* Content */}
                                <div>
                                    <p className="text-slate-400 text-[10px] font-medium mb-2 tracking-wide uppercase">{stat.label}</p>
                                    <p className="text-2xl font-bold text-white mb-1 tracking-tight" style={{
                                        textShadow: `0 0 20px rgba(${stat.glowColor}, 0.3)`
                                    }}>
                                        {stat.value}
                                    </p>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-bold flex items-center gap-1 ${stat.positive ? 'text-emerald-400' : 'text-rose-400'}`}
                                            style={{
                                                textShadow: stat.positive
                                                    ? '0 0 10px rgba(52, 211, 153, 0.5)'
                                                    : '0 0 10px rgba(251, 113, 133, 0.5)'
                                            }}>
                                            {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                            {stat.change}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">{stat.subValue}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Content Area - Better responsive layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Top AI Signals Panel */}
                <div
                    className="lg:col-span-2 rounded-2xl p-6 backdrop-blur-sm"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
                    }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div 
                                className="p-2 rounded-xl"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
                                    border: '1px solid rgba(139, 92, 246, 0.4)',
                                    boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3), 0 0 40px rgba(168, 85, 247, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                                }}
                            >
                                <Brain className="w-4 h-4 text-purple-400" style={{
                                    filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.8))'
                                }} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white" style={{
                                    textShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
                                }}>
                                    Top 3 AI Signals
                                </h3>
                                <p className="text-[10px] text-slate-400">Highest confidence predictions • Neural network: {aiAccuracy}%</p>
                            </div>
                        </div>
                        <div 
                            className="px-2.5 py-1 rounded-full"
                            style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
                            }}
                        >
                            <span className="text-[10px] font-semibold text-emerald-400" style={{
                                textShadow: '0 0 10px rgba(52, 211, 153, 0.8)'
                            }}>
                                ACTIVE
                            </span>
                        </div>
                    </div>

                    {loading && !topSignals.length ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((idx) => (
                                <div key={idx} className="p-4 rounded-xl animate-pulse" style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                }}>
                                    <div className="h-4 bg-slate-700 rounded w-1/3 mb-2"></div>
                                    <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                                </div>
                            ))}
                        </div>
                    ) : (topSignals?.length || 0) > 0 ? (
                        <div className="space-y-3">
                            {(topSignals || []).map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="group relative flex items-center justify-between p-4 rounded-xl transition-all duration-300 hover:scale-[1.02]"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.05)'
                                    }}
                                >
                                    <div
                                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                                        style={{
                                            background: item.prediction === 'BULLISH'
                                                ? 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 70%)'
                                                : 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.15) 0%, transparent 70%)',
                                            zIndex: -1
                                        }}
                                    />

                                    <div className="flex items-center gap-4 flex-1">
                                        <div>
                                            <span className="font-bold text-white text-base block mb-1">{item.pair}</span>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-slate-500" />
                                                <span className="text-[10px] text-slate-500">{item.timeframe}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div
                                                className="px-3 py-1.5 rounded-lg"
                                                style={{
                                                    background: item.prediction === 'BULLISH'
                                                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.25) 100%)'
                                                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.25) 100%)',
                                                    border: item.prediction === 'BULLISH'
                                                        ? '1px solid rgba(16, 185, 129, 0.4)'
                                                        : '1px solid rgba(239, 68, 68, 0.4)',
                                                    boxShadow: item.prediction === 'BULLISH'
                                                        ? '0 4px 16px rgba(16, 185, 129, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
                                                        : '0 4px 16px rgba(239, 68, 68, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
                                                }}
                                            >
                                                <span
                                                    className={`text-xs font-bold ${item.prediction === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}`}
                                                    style={{
                                                        textShadow: item.prediction === 'BULLISH'
                                                            ? '0 0 10px rgba(52, 211, 153, 0.8)'
                                                            : '0 0 10px rgba(251, 113, 133, 0.8)'
                                                    }}
                                                >
                                                    {item.prediction}
                                                </span>
                                            </div>

                                            <div
                                                className="px-2 py-1 rounded text-[10px] font-bold"
                                                style={{
                                                    background: item.strength === 'STRONG'
                                                        ? 'rgba(16, 185, 129, 0.15)'
                                                        : item.strength === 'MODERATE'
                                                            ? 'rgba(59, 130, 246, 0.15)'
                                                            : 'rgba(251, 191, 36, 0.15)',
                                                    color: item.strength === 'STRONG'
                                                        ? 'rgb(52, 211, 153)'
                                                        : item.strength === 'MODERATE'
                                                            ? 'rgb(96, 165, 250)'
                                                            : 'rgb(251, 191, 36)'
                                                }}
                                            >
                                                {item.strength}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 mb-1">Confidence</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-2 bg-slate-800/50 rounded-full overflow-hidden" style={{
                                                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)'
                                                }}>
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${
                                                            item.prediction === 'BULLISH' 
                                                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                                                : 'bg-gradient-to-r from-rose-500 to-rose-400'
                                                        }`}
                                                        style={{ 
                                                            width: `${item.confidence}%`,
                                                            boxShadow: item.prediction === 'BULLISH'
                                                                ? '0 0 10px rgba(16, 185, 129, 0.6)'
                                                                : '0 0 10px rgba(239, 68, 68, 0.6)'
                                                        }}
                                                    />
                                                </div>
                                                <span 
                                                    className={`text-base font-bold w-12 text-right ${
                                                        item.prediction === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'
                                                    }`}
                                                    style={{
                                                        textShadow: item.prediction === 'BULLISH'
                                                            ? '0 0 10px rgba(52, 211, 153, 0.8)'
                                                            : '0 0 10px rgba(251, 113, 133, 0.8)'
                                                    }}
                                                >
                                                    {item.confidence}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="inline-flex p-4 rounded-2xl mb-4" style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.2)'
                            }}>
                                <Brain className="w-12 h-12 text-purple-400/50" />
                            </div>
                            <p className="text-slate-400 font-medium mb-1">No signals available</p>
                            <p className="text-slate-500 text-xs">Signals will appear here when generated by the AI engine</p>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="mt-4 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-all text-xs font-medium"
                            >
                                Refresh Data
                            </button>
                        </div>
                    )}
                </div>

                {/* Live Market Ticker */}
                <div
                    className="rounded-2xl p-6 backdrop-blur-sm"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                        border: '1px solid rgba(6, 182, 212, 0.2)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(6, 182, 212, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.08)'
                    }}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div
                            className="p-2 rounded-xl"
                            style={{
                                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)',
                                border: '1px solid rgba(6, 182, 212, 0.4)',
                                boxShadow: '0 8px 24px rgba(6, 182, 212, 0.3), 0 0 40px rgba(59, 130, 246, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.2)'
                            }}
                        >
                            <Activity className="w-4 h-4 text-cyan-400" style={{
                                filter: 'drop-shadow(0 0 12px rgba(34, 211, 238, 0.8))'
                            }} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white" style={{
                                textShadow: '0 0 20px rgba(6, 182, 212, 0.3)'
                            }}>
                                Live Market
                            </h3>
                            <p className="text-[10px] text-slate-400">Real-time prices</p>
                        </div>
                    </div>

                    {loading && !marketPrices.length ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((idx) => (
                                <div key={idx} className="p-4 rounded-xl animate-pulse" style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                }}>
                                    <div className="h-4 bg-slate-700 rounded w-2/3 mb-2"></div>
                                    <div className="h-6 bg-slate-700 rounded w-1/2 mb-2"></div>
                                    <div className="h-3 bg-slate-700 rounded w-1/3"></div>
                                </div>
                            ))}
                        </div>
                    ) : (marketPrices?.length || 0) > 0 ? (
                        <div className="space-y-3">
                            {(marketPrices || []).map((item, idx) => (
                                <div 
                                    key={idx}
                                    className="group p-4 rounded-xl transition-all duration-300 hover:scale-[1.02]"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.05)'
                                    }}
                                >
                                    <div
                                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none"
                                        style={{
                                            background: item.change >= 0
                                                ? 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 70%)'
                                                : 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.1) 0%, transparent 70%)',
                                            zIndex: -1
                                        }}
                                    />

                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-bold text-white">{item.symbol}</span>
                                        <div className="flex items-center gap-2">
                                            {item.change >= 0 ?
                                                <ArrowUpRight className="w-3 h-3 text-emerald-400" /> :
                                                <ArrowDownRight className="w-3 h-3 text-rose-400" />
                                            }
                                            <span
                                                className="text-[10px] font-bold px-2 py-1 rounded"
                                                style={{
                                                    background: item.change >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                    color: item.change >= 0 ? 'rgb(52, 211, 153)' : 'rgb(251, 113, 133)',
                                                    boxShadow: item.change >= 0
                                                        ? '0 0 15px rgba(16, 185, 129, 0.3)'
                                                        : '0 0 15px rgba(239, 68, 68, 0.3)',
                                                    textShadow: item.change >= 0
                                                        ? '0 0 8px rgba(52, 211, 153, 0.8)'
                                                        : '0 0 8px rgba(251, 113, 133, 0.8)'
                                                }}
                                            >
                                                {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-xl font-bold text-white mb-2" style={{
                                        textShadow: '0 0 15px rgba(255, 255, 255, 0.2)'
                                    }}>
                                        ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>

                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-slate-500">24h Volume</span>
                                        <span className="text-slate-400 font-semibold">{item.volume}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="inline-flex p-4 rounded-2xl mb-4" style={{
                                background: 'rgba(6, 182, 212, 0.1)',
                                border: '1px solid rgba(6, 182, 212, 0.2)'
                            }}>
                                <Activity className="w-12 h-12 text-cyan-400/50" />
                            </div>
                            <p className="text-slate-400 font-medium mb-1">No market data</p>
                            <p className="text-slate-500 text-xs">Market prices will appear here when available</p>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="mt-4 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all text-xs font-medium"
                            >
                                Load Data
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Status Banner - Cleaner design */}
            <div
                className="rounded-xl p-3 backdrop-blur-sm mb-6"
                style={{
                    background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 50%, rgba(236, 72, 153, 0.08) 100%)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div
                            className="w-2 h-2 rounded-full bg-emerald-400"
                            style={{ 
                                boxShadow: '0 0 10px rgba(52, 211, 153, 0.8)',
                                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                            }}
                        />
                        <span className="font-semibold text-sm text-white">
                            All Systems Operational
                        </span>
                        <span className="text-xs text-slate-500">
                            • Real-time Data • AI Active • Market Streaming
                        </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{lastUpdate.toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>

            {/* Enhanced Dashboard: Chart + News + Sentiment + Signals (unified) */}
            <div className="mt-8">
                <EnhancedSymbolDashboard
                    symbol={currentSymbol}
                    timeframe={currentTimeframe}
                    hideBottomDuplicateSignals={true}
                />
            </div>
        </div>
    );
};

export default DashboardView;
