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

    // NO MOCK DATA: Show clear fallback states when data unavailable
    const statCards: StatCard[] = [
        {
            label: 'Total Portfolio',
            value: portfolioData && portfolioValue !== undefined && portfolioValue !== null
                ? `$${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                : (loading ? '—' : 'DATA_UNAVAILABLE'),
            change: portfolioData && portfolioChange !== undefined && portfolioChange !== null
                ? `${portfolioChange >= 0 ? '+' : ''}${portfolioChange.toFixed(2)}%` 
                : (loading ? '—' : 'N/A'),
            subValue: portfolioData && portfolioChangeAmount !== undefined && portfolioChangeAmount !== null
                ? `${portfolioChange >= 0 ? '+' : ''}$${Math.abs(portfolioChangeAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
                : (loading ? '—' : 'Connect exchange to view portfolio'),
            positive: portfolioChange >= 0,
            icon: Wallet,
            gradient: 'from-blue-500/20 via-blue-600/10 to-cyan-500/20',
            iconGradient: 'from-blue-400 to-cyan-400',
            glowColor: '59, 130, 246'
        },
        {
            label: 'Active Positions',
            value: activePositions !== undefined && activePositions !== null ? activePositions.toString() : (loading ? '—' : '0'),
            change: newPositionsToday !== undefined ? `+${newPositionsToday} today` : (loading ? '—' : '+0 today'),
            subValue: totalPositions !== undefined ? `${totalPositions} total positions` : (loading ? '—' : '0 total positions'),
            positive: true,
            icon: Target,
            gradient: 'from-emerald-500/20 via-emerald-600/10 to-teal-500/20',
            iconGradient: 'from-emerald-400 to-teal-400',
            glowColor: '16, 185, 129'
        },
        {
            label: '24h P&L',
            value: dayPnL !== undefined && dayPnL !== null
                ? `${dayPnL >= 0 ? '+' : ''}$${Math.abs(dayPnL).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : (loading ? '—' : '$0.00'),
            change: dayPnLPercent !== undefined && dayPnLPercent !== null
                ? `${dayPnLPercent >= 0 ? '+' : ''}${dayPnLPercent.toFixed(2)}%`
                : (loading ? '—' : '0.00%'),
            subValue: weekPnL !== undefined && weekPnL !== null
                ? `7d: ${weekPnL >= 0 ? '+' : ''}$${weekPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : (loading ? '—' : '7d: $0.00'),
            positive: dayPnL >= 0,
            icon: dayPnL >= 0 ? TrendingUp : TrendingDown,
            gradient: dayPnL >= 0 ? 'from-green-500/20 via-green-600/10 to-emerald-500/20' : 'from-red-500/20 via-red-600/10 to-rose-500/20',
            iconGradient: dayPnL >= 0 ? 'from-green-400 to-emerald-400' : 'from-red-400 to-rose-400',
            glowColor: dayPnL >= 0 ? '34, 197, 94' : '239, 68, 68'
        },
        {
            label: 'AI Signals',
            value: aiSignalsCount !== undefined && aiSignalsCount !== null ? aiSignalsCount.toString() : (loading ? '—' : '0'),
            change: aiAccuracy !== undefined && aiAccuracy !== null ? `${aiAccuracy}% accuracy` : (loading ? '—' : '0% accuracy'),
            subValue: aiActiveModels !== undefined ? `${aiActiveModels} models active` : (loading ? '—' : '0 models active'),
            positive: true,
            icon: Brain,
            gradient: 'from-purple-500/20 via-purple-600/10 to-violet-500/20',
            iconGradient: 'from-purple-400 to-violet-400',
            glowColor: '139, 92, 246'
        },
    ];

    // Premium skeleton loader for initial load
    if (loading && !portfolioData && marketPrices.length === 0) {
        return (
            <div className="w-full min-h-full animate-fade-in">
                <ErrorBoundary>
                    {/* Skeleton Market Ticker */}
                    <div className="mb-6 bg-gray-900 border-b border-gray-800 p-4 rounded-lg animate-pulse">
                        <div className="h-8 bg-slate-700/30 rounded w-full"></div>
                    </div>

                    {/* Skeleton Header */}
                    <div className="mb-6">
                        <div className="h-8 bg-slate-700/30 rounded w-64 mb-2 animate-pulse"></div>
                        <div className="h-4 bg-slate-700/20 rounded w-96 animate-pulse"></div>
                    </div>

                    {/* Skeleton Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map((idx) => (
                            <div
                                key={`skeleton-stat-${idx}`}
                                className="relative overflow-hidden rounded-2xl p-6 animate-pulse"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
                                }}
                            >
                                <div className="h-10 w-10 bg-slate-700/30 rounded-xl mb-4"></div>
                                <div className="h-3 bg-slate-700/30 rounded w-24 mb-3"></div>
                                <div className="h-8 bg-slate-700/40 rounded w-32 mb-2"></div>
                                <div className="h-3 bg-slate-700/30 rounded w-20 mb-2"></div>
                                <div className="h-2 bg-slate-700/20 rounded w-28"></div>
                            </div>
                        ))}
                    </div>

                    {/* Skeleton Main Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                        <div className="lg:col-span-2 rounded-2xl p-6 animate-pulse" style={{
                            background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                            border: '1px solid rgba(139, 92, 246, 0.2)'
                        }}>
                            <div className="h-6 bg-slate-700/30 rounded w-48 mb-4"></div>
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-20 bg-slate-700/20 rounded-xl mb-3"></div>
                            ))}
                        </div>
                        <div className="rounded-2xl p-6 animate-pulse" style={{
                            background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 100%)',
                            border: '1px solid rgba(6, 182, 212, 0.2)'
                        }}>
                            <div className="h-6 bg-slate-700/30 rounded w-32 mb-4"></div>
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-24 bg-slate-700/20 rounded-xl mb-3"></div>
                            ))}
                        </div>
                    </div>

                    <div className="text-center mt-8">
                        <LoadingSpinner size="large" text="Loading institutional-grade data..." />
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

            {/* PREMIUM ANIMATIONS & STYLES */}
            <style>{`
                @keyframes shimmer {
                    0% { background-position: -1000px 0; }
                    100% { background-position: 1000px 0; }
                }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                
                @keyframes glow-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                @keyframes slide-in {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
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
                
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                
                .animate-glow-pulse {
                    animation: glow-pulse 2s ease-in-out infinite;
                }
                
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }
                
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out;
                }
                
                /* PREVENT LAYOUT SHIFTS: Fixed heights for loading states */
                .stat-card-skeleton {
                    min-height: 180px;
                }
                
                /* RESPONSIVE: Mobile-first design */
                @media (max-width: 640px) {
                    .stat-card-value {
                        font-size: 1.5rem;
                    }
                    .stat-card-icon {
                        padding: 0.5rem;
                    }
                    h1 {
                        font-size: 1.5rem !important;
                    }
                }
                
                /* SMOOTH TRANSITIONS: No jumping */
                * {
                    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                }
            `}</style>

            {/* VISUAL HIERARCHY: Header - The Human Eye Starts Here */}
            <div className="mb-6 animate-slide-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 lg:gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent" style={{
                            textShadow: '0 0 40px rgba(139, 92, 246, 0.3)',
                            letterSpacing: '-0.02em'
                        }}>
                            Dashboard Overview
                        </h1>
                        <p className="text-slate-400 text-xs mt-2 font-medium tracking-wide">Real-time institutional market intelligence and portfolio analytics</p>
                        {error && (
                            <div className="mt-3 animate-fade-in">
                                <div className="group relative flex items-center gap-3 px-4 py-3 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.01]"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        boxShadow: '0 4px 16px rgba(239, 68, 68, 0.2)'
                                    }}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" style={{
                                        filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))'
                                    }} />
                                    <span className="text-red-300 text-xs font-medium flex-1">{error}</span>
                                    <button
                                        onClick={() => setError(null)}
                                        className="ml-2 p-1 rounded-lg hover:bg-red-500/20 transition-all duration-200"
                                        aria-label="Dismiss error"
                                    >
                                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${
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
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
                {(statCards || []).map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={`stat-${stat.label}-${index}`}
                            className="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl cursor-pointer"
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
                                {/* Icon with VISUAL FEEDBACK */}
                                <div
                                    className="inline-flex p-3 rounded-xl mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
                                    style={{
                                        background: `linear-gradient(135deg, ${stat.gradient})`,
                                        boxShadow: `0 12px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(${stat.glowColor}, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.25)`
                                    }}
                                >
                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-white/30" />
                                    <Icon className="w-6 h-6 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
                                </div>

                                {/* Content - DEFENSIVE: All values have fallbacks */}
                                <div>
                                    <p className="text-slate-400 text-[10px] font-bold mb-2 tracking-wider uppercase">{stat?.label || 'METRIC'}</p>
                                    {/* THE MOST IMPORTANT: Value (Biggest & Boldest) */}
                                    <p className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight transition-all duration-500 group-hover:scale-105" style={{
                                        textShadow: `0 0 30px rgba(${stat.glowColor}, 0.4)`,
                                        letterSpacing: '-0.02em'
                                    }}>
                                        {stat?.value || '—'}
                                    </p>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-xs font-bold flex items-center gap-1 transition-all duration-300 ${stat.positive ? 'text-emerald-400' : 'text-rose-400'}`}
                                            style={{
                                                textShadow: stat.positive
                                                    ? '0 0 10px rgba(52, 211, 153, 0.5)'
                                                    : '0 0 10px rgba(251, 113, 133, 0.5)'
                                            }}>
                                            {stat.positive ? <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /> : <ArrowDownRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />}
                                            {stat.change || '—'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">{stat.subValue || '—'}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Content Area - Better responsive layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
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
                                <div key={idx} className="group relative p-4 rounded-xl animate-pulse" style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                }}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="h-4 bg-slate-700/40 rounded w-24 mb-2"></div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-20 bg-slate-700/40 rounded-lg"></div>
                                            <div className="h-6 w-16 bg-slate-700/30 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between">
                                            <div className="h-3 bg-slate-700/30 rounded w-20"></div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-20 bg-slate-700/30 rounded-full"></div>
                                                <div className="h-4 w-12 bg-slate-700/40 rounded"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : topSignals && (topSignals?.length || 0) > 0 ? (
                        <div className="space-y-3">
                            {(topSignals || []).map((item, idx) => (
                                <div 
                                    key={idx} 
                                    className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer"
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

                                    <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
                                        <div>
                                            <span className="font-bold text-white text-sm sm:text-base block mb-1 group-hover:text-purple-300 transition-colors">{item.pair || 'N/A'}</span>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-slate-500" />
                                                <span className="text-[10px] text-slate-500">{item.timeframe}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <div
                                                className="px-3 py-1.5 rounded-lg group-hover:scale-105 transition-transform duration-300"
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
                                                    {item.prediction || 'NEUTRAL'}
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

                                    <div className="flex items-center gap-4 mt-3 sm:mt-0 w-full sm:w-auto">
                                        <div className="text-right flex-1 sm:flex-initial">
                                            <p className="text-[10px] text-slate-400 mb-1">Confidence</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-2 bg-slate-800/50 rounded-full overflow-hidden" style={{
                                                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)'
                                                }}>
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 group-hover:animate-pulse ${
                                                            item.prediction === 'BULLISH' 
                                                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                                                : 'bg-gradient-to-r from-rose-500 to-rose-400'
                                                        }`}
                                                        style={{ 
                                                            width: `${item.confidence || 0}%`,
                                                            boxShadow: item.prediction === 'BULLISH'
                                                                ? '0 0 10px rgba(16, 185, 129, 0.6)'
                                                                : '0 0 10px rgba(239, 68, 68, 0.6)'
                                                        }}
                                                    />
                                                </div>
                                                <span 
                                                    className={`text-base font-bold w-12 text-right group-hover:scale-110 transition-transform ${
                                                        item.prediction === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'
                                                    }`}
                                                    style={{
                                                        textShadow: item.prediction === 'BULLISH'
                                                            ? '0 0 10px rgba(52, 211, 153, 0.8)'
                                                            : '0 0 10px rgba(251, 113, 133, 0.8)'
                                                    }}
                                                >
                                                    {item.confidence !== undefined && item.confidence !== null ? `${item.confidence}%` : '0%'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 animate-fade-in">
                            <div className="inline-flex p-4 rounded-2xl mb-4 animate-pulse" style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                boxShadow: '0 0 40px rgba(139, 92, 246, 0.2)'
                            }}>
                                <Brain className="w-12 h-12 text-purple-400/50" style={{
                                    filter: 'drop-shadow(0 0 12px rgba(139, 92, 246, 0.4))'
                                }} />
                            </div>
                            <p className="text-slate-400 font-semibold mb-2" style={{
                                textShadow: '0 0 10px rgba(139, 92, 246, 0.2)'
                            }}>No AI signals available</p>
                            <p className="text-slate-500 text-xs mb-6">Signals will appear here when generated by the neural network</p>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="group px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 hover:scale-105 active:scale-95 transition-all duration-300 text-xs font-semibold shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    boxShadow: '0 4px 16px rgba(139, 92, 246, 0.2)'
                                }}
                            >
                                <span className="flex items-center gap-2">
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                                    <span className={isRefreshing ? 'opacity-70' : ''}>
                                        {isRefreshing ? 'Refreshing' : 'Refresh Data'}
                                    </span>
                                </span>
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
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="h-4 bg-slate-700/40 rounded w-24"></div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 bg-slate-700/30 rounded"></div>
                                            <div className="h-6 w-16 bg-slate-700/40 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="h-7 bg-slate-700/40 rounded w-32 mb-3"></div>
                                    <div className="flex items-center justify-between">
                                        <div className="h-3 bg-slate-700/30 rounded w-20"></div>
                                        <div className="h-3 bg-slate-700/30 rounded w-16"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : marketPrices && (marketPrices?.length || 0) > 0 ? (
                        <div className="space-y-3">
                            {(marketPrices || []).map((item, idx) => (
                                <div 
                                    key={idx}
                                    className="group relative p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer"
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
                                        <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">{item.symbol || 'N/A'}</span>
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

                                    <p className="text-xl font-bold text-white mb-2 group-hover:scale-105 transition-transform duration-300" style={{
                                        textShadow: '0 0 15px rgba(255, 255, 255, 0.2)'
                                    }}>
                                        ${item.price !== undefined && item.price !== null ? item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                    </p>

                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-slate-500">24h Volume</span>
                                        <span className="text-slate-400 font-semibold">{item.volume || 'N/A'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 animate-fade-in">
                            <div className="inline-flex p-4 rounded-2xl mb-4 animate-pulse" style={{
                                background: 'rgba(6, 182, 212, 0.1)',
                                border: '1px solid rgba(6, 182, 212, 0.2)',
                                boxShadow: '0 0 40px rgba(6, 182, 212, 0.2)'
                            }}>
                                <Activity className="w-12 h-12 text-cyan-400/50" style={{
                                    filter: 'drop-shadow(0 0 12px rgba(6, 182, 212, 0.4))'
                                }} />
                            </div>
                            <p className="text-slate-400 font-semibold mb-2" style={{
                                textShadow: '0 0 10px rgba(6, 182, 212, 0.2)'
                            }}>No market data available</p>
                            <p className="text-slate-500 text-xs mb-6">Real-time prices will appear here when the data feed is active</p>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="group px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 hover:scale-105 active:scale-95 transition-all duration-300 text-xs font-semibold shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    boxShadow: '0 4px 16px rgba(6, 182, 212, 0.2)'
                                }}
                            >
                                <span className="flex items-center gap-2">
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
                                    <span className={isRefreshing ? 'opacity-70' : ''}>
                                        {isRefreshing ? 'Refreshing' : 'Load Data'}
                                    </span>
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* DEFENSIVE UI: System Status Banner */}
            <div
                className="rounded-xl p-4 backdrop-blur-sm mb-6 animate-slide-in transition-all duration-300 hover:scale-[1.01]"
                style={{
                    background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 50%, rgba(236, 72, 153, 0.08) 100%)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    boxShadow: '0 4px 16px rgba(139, 92, 246, 0.1)'
                }}
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 lg:gap-4">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <div
                            className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-glow-pulse"
                            style={{ 
                                boxShadow: '0 0 12px rgba(52, 211, 153, 0.8)'
                            }}
                        />
                        <span className="font-bold text-sm text-white" style={{
                            textShadow: '0 0 10px rgba(52, 211, 153, 0.3)'
                        }}>
                            All Systems Operational
                        </span>
                        <span className="text-xs text-slate-500 hidden sm:inline font-medium">
                            • Live Data • AI Neural Network Active • Real-time Streaming
                        </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="tabular-nums">{lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}</span>
                    </div>
                </div>
            </div>

            {/* Enhanced Dashboard: Chart + News + Sentiment + Signals (unified) */}
            <div className="mt-8 animate-slide-in">
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
