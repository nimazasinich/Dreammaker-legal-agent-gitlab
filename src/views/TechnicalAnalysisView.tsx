/**
 * Technical Analysis Dashboard
 * 
 * Integrates pattern detection services into a unified interface for advanced market analysis.
 * This dashboard exposes previously backend-only analyzers with real-time visualizations.
 * 
 * @component
 * @example
 * ```tsx
 * <TechnicalAnalysisView />
 * ```
 * 
 * Features:
 * - Smart Money Concepts (order blocks, liquidity zones)
 * - Elliott Wave pattern analysis
 * - Fibonacci retracement levels
 * - Harmonic pattern detection (Gartley, Bat, Butterfly, Crab)
 * - Parabolic SAR signals
 * - Market regime classification
 * 
 * @since 1.0.0
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { DatasourceClient } from '../services/DatasourceClient';
import { SMCAnalyzer } from '../services/SMCAnalyzer';
import { ElliottWaveAnalyzer } from '../services/ElliottWaveAnalyzer';
import { FibonacciDetector } from '../services/FibonacciDetector';
import { HarmonicPatternDetector } from '../services/HarmonicPatternDetector';
import { ParabolicSARDetector } from '../services/ParabolicSARDetector';
import { RegimeDetector } from '../services/RegimeDetector';
import { 
  TrendingUp, 
  Activity, 
  Target, 
  Waves, 
  AlertCircle,
  Layers,
  TrendingDown,
  Minus,
  BarChart3
} from 'lucide-react';

/**
 * Main Technical Analysis View Component
 * Fetches OHLCV data and runs all pattern analyzers
 */
export const TechnicalAnalysisView: React.FC = () => {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('4h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Analysis results state
  const [smcData, setSMCData] = useState<any>(null);
  const [elliottData, setElliottData] = useState<any>(null);
  const [fibonacciData, setFibonacciData] = useState<any>(null);
  const [harmonicData, setHarmonicData] = useState<any>(null);
  const [sarData, setSARData] = useState<any>(null);
  const [regimeData, setRegimeData] = useState<any>(null);

  /**
   * Fetches OHLCV data and runs all pattern analyzers
   * Uses DatasourceClient for Hub Proxy integration
   */
  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const datasource = DatasourceClient.getInstance();
      
      // Fetch historical OHLCV data (required by analyzers)
      const ohlcv = await datasource.getPriceChart(symbol, timeframe, 200);
      
      if (!ohlcv || ohlcv.length === 0) {
        throw new Error(`No data available for ${symbol}`);
      }

      // Transform data to expected format (most analyzers expect 'close', 'open', 'high', 'low', 'volume')
      const transformedData = ohlcv.map(candle => ({
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      }));

      // Run all analyzers in parallel for better performance
      const [smc, elliott, fib, harmonic, sar, regime] = await Promise.all([
        // Smart Money Concepts
        Promise.resolve().then(() => {
          const smcAnalyzer = SMCAnalyzer.getInstance();
          const liquidityZones = smcAnalyzer.detectLiquidityZones(transformedData as any);
          const orderBlocks = smcAnalyzer.detectOrderBlocks(transformedData as any);
          const fvg = smcAnalyzer.detectFairValueGaps(transformedData as any);
          return { liquidityZones, orderBlocks, fvg };
        }),
        
        // Elliott Wave Analysis
        Promise.resolve().then(() => {
          const elliottAnalyzer = ElliottWaveAnalyzer.getInstance();
          return elliottAnalyzer.analyzeElliottWaves(transformedData as any);
        }),
        
        // Fibonacci Retracement
        Promise.resolve().then(() => {
          const fibDetector = FibonacciDetector.getInstance();
          return fibDetector.detect(transformedData as any);
        }),
        
        // Harmonic Patterns
        Promise.resolve().then(() => {
          const harmonicDetector = HarmonicPatternDetector.getInstance();
          return harmonicDetector.detectHarmonicPatterns(transformedData as any);
        }),
        
        // Parabolic SAR
        Promise.resolve().then(() => {
          const sarDetector = ParabolicSARDetector.getInstance();
          return sarDetector.detect(transformedData as any);
        }),
        
        // Market Regime
        Promise.resolve().then(() => {
          const regimeDetector = RegimeDetector.getInstance();
          return regimeDetector.detect(transformedData as any);
        })
      ]);

      // Update state with results
      setSMCData(smc);
      setElliottData(elliott);
      setFibonacciData(fib);
      setHarmonicData(harmonic);
      setSARData(sar);
      setRegimeData(regime);
      
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Failed to run analysis');
    } finally {
      setLoading(false);
    }
  };

  // Run analysis on mount and when symbol/timeframe changes
  useEffect(() => {
    runAnalysis();
  }, [symbol, timeframe]);

  return (
    <div className="min-h-screen bg-[color:var(--surface-page)] p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="p-3 rounded-xl shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
              }}
            >
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[color:var(--text-primary)]">
                Technical Analysis Dashboard
              </h1>
              <p className="text-[color:var(--text-secondary)]">
                Advanced pattern detection and market structure analysis
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="card-base rounded-xl p-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">
              Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full bg-[color:var(--surface)] text-[color:var(--text-primary)] px-4 py-2 rounded-lg border border-[color:var(--border)] focus:border-[color:var(--primary-500)] focus:outline-none"
              placeholder="BTCUSDT"
            />
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-[color:var(--surface)] text-[color:var(--text-primary)] px-4 py-2 rounded-lg border border-[color:var(--border)] focus:border-[color:var(--primary-500)] focus:outline-none"
            >
              <option value="15m">15 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
            </select>
          </div>
          
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="px-6 py-2 rounded-lg font-medium text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: loading 
                ? 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)'
                : 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
            }}
          >
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="card-base bg-red-50 border-2 border-red-500 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="text-red-900 font-bold">Analysis Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* Smart Money Concepts Card */}
          <AnalysisCard
            icon={<Layers className="w-6 h-6" />}
            title="Smart Money Concepts"
            data={smcData}
            loading={loading}
            renderContent={(data) => (
              <div className="space-y-3">
                <MetricRow 
                  label="Liquidity Zones" 
                  value={data.liquidityZones?.length || 0}
                />
                <MetricRow 
                  label="Order Blocks" 
                  value={data.orderBlocks?.length || 0}
                />
                <MetricRow 
                  label="Fair Value Gaps" 
                  value={data.fvg?.length || 0}
                />
                {data.liquidityZones && data.liquidityZones.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
                    <div className="text-xs text-[color:var(--text-secondary)] mb-2">
                      Top Zone: {data.liquidityZones[0].type}
                    </div>
                    <div className="text-sm text-[color:var(--text-primary)]">
                      ${data.liquidityZones[0].price.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            )}
          />

          {/* Elliott Wave Card */}
          <AnalysisCard
            icon={<Waves className="w-6 h-6" />}
            title="Elliott Wave Analysis"
            data={elliottData}
            loading={loading}
            renderContent={(data) => (
              <div className="space-y-3">
                <MetricRow 
                  label="Current Wave" 
                  value={data.currentWave?.wave || 'N/A'}
                />
                <MetricRow 
                  label="Wave Type" 
                  value={data.currentWave?.type || 'N/A'}
                />
                <MetricRow 
                  label="Completion" 
                  value={data.completionProbability 
                    ? `${(data.completionProbability * 100).toFixed(1)}%` 
                    : 'N/A'}
                />
                <MetricRow 
                  label="Next Direction" 
                  value={data.nextExpectedDirection || 'N/A'}
                  valueColor={
                    data.nextExpectedDirection === 'UP' 
                      ? 'text-emerald-600' 
                      : data.nextExpectedDirection === 'DOWN'
                      ? 'text-red-600'
                      : 'text-[color:var(--text-primary)]'
                  }
                />
              </div>
            )}
          />

          {/* Fibonacci Levels Card */}
          <AnalysisCard
            icon={<Target className="w-6 h-6" />}
            title="Fibonacci Retracement"
            data={fibonacciData}
            loading={loading}
            renderContent={(data) => (
              <div className="space-y-2">
                {data.isValid && data.levels && data.levels.length > 0 ? (
                  <>
                    <div className="text-xs text-[color:var(--text-secondary)] mb-3">
                      Signal: 
                      <span className={`ml-2 font-bold ${
                        data.signal === 'BUY' 
                          ? 'text-emerald-600' 
                          : data.signal === 'SELL'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}>
                        {data.signal}
                      </span>
                      <span className="ml-2 text-[color:var(--text-muted)]">
                        ({(data.confidence * 100).toFixed(0)}% conf)
                      </span>
                    </div>
                    {data.levels.slice(0, 5).map((level: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between py-1 px-2 rounded bg-[color:var(--surface-muted)]"
                      >
                        <span className="text-sm text-[color:var(--text-secondary)]">
                          {(level.level * 100).toFixed(1)}%
                        </span>
                        <span className="text-sm font-medium text-[color:var(--text-primary)]">
                          ${level.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center text-[color:var(--text-muted)] py-4">
                    No valid Fibonacci levels detected
                  </div>
                )}
              </div>
            )}
          />

          {/* Harmonic Patterns Card */}
          <AnalysisCard
            icon={<BarChart3 className="w-6 h-6" />}
            title="Harmonic Patterns"
            data={harmonicData}
            loading={loading}
            renderContent={(data) => (
              <div className="space-y-2">
                {data && data.length > 0 ? (
                  data.slice(0, 4).map((pattern: any, idx: number) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg bg-[color:var(--surface-muted)] border border-[color:var(--border)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[color:var(--text-primary)]">
                          {pattern.name || pattern.type}
                        </span>
                        <span className={`text-sm px-2 py-1 rounded ${
                          pattern.direction === 'BULLISH'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {pattern.direction}
                        </span>
                      </div>
                      <div className="text-xs text-[color:var(--text-secondary)] mt-1">
                        Confidence: {((pattern.confidence || 0) * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-[color:var(--text-muted)] py-4">
                    No harmonic patterns detected
                  </div>
                )}
              </div>
            )}
          />

          {/* Parabolic SAR Card */}
          <AnalysisCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Parabolic SAR"
            data={sarData}
            loading={loading}
            renderContent={(data) => (
              <div className="space-y-3">
                <MetricRow 
                  label="Current Signal" 
                  value={data.signal || 'NEUTRAL'}
                  valueColor={
                    data.signal === 'BUY' 
                      ? 'text-emerald-600' 
                      : data.signal === 'SELL'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }
                />
                <MetricRow 
                  label="Confidence" 
                  value={data.confidence 
                    ? `${(data.confidence * 100).toFixed(1)}%` 
                    : 'N/A'}
                />
                <MetricRow 
                  label="Score" 
                  value={data.score?.toFixed(2) || 'N/A'}
                />
                {data.reasoning && data.reasoning.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
                    <div className="text-xs text-[color:var(--text-secondary)]">
                      {data.reasoning[0]}
                    </div>
                  </div>
                )}
              </div>
            )}
          />

          {/* Market Regime Card */}
          <AnalysisCard
            icon={<Activity className="w-6 h-6" />}
            title="Market Regime"
            data={regimeData}
            loading={loading}
            renderContent={(data) => (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[color:var(--text-secondary)]">Current Regime</span>
                  <div className="flex items-center gap-2">
                    {data.regime === 'bull' && <TrendingUp className="w-5 h-5 text-emerald-600" />}
                    {data.regime === 'bear' && <TrendingDown className="w-5 h-5 text-red-600" />}
                    {data.regime === 'sideways' && <Minus className="w-5 h-5 text-yellow-600" />}
                    <span className={`font-bold uppercase ${
                      data.regime === 'bull' 
                        ? 'text-emerald-600' 
                        : data.regime === 'bear'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}>
                      {data.regime}
                    </span>
                  </div>
                </div>
                <MetricRow 
                  label="Confidence" 
                  value={data.confidence 
                    ? `${(data.confidence * 100).toFixed(1)}%` 
                    : 'N/A'}
                />
                <MetricRow 
                  label="Score" 
                  value={data.score?.toFixed(2) || 'N/A'}
                />
                {data.indicators && (
                  <div className="mt-4 pt-4 border-t border-[color:var(--border)] space-y-1">
                    <div className="text-xs text-[color:var(--text-secondary)]">
                      ATR: {data.indicators.atrPercent?.toFixed(2)}%
                    </div>
                    <div className="text-xs text-[color:var(--text-secondary)]">
                      Volume Trend: {data.indicators.volumeTrend?.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            )}
          />

        </div>
      </div>
    </div>
  );
};

/**
 * Reusable card component for analysis sections
 * 
 * @param icon - Lucide React icon component
 * @param title - Card title
 * @param data - Analysis data
 * @param loading - Loading state
 * @param renderContent - Function to render card content
 */
interface AnalysisCardProps {
  icon: React.ReactNode;
  title: string;
  data: any;
  loading: boolean;
  renderContent: (data: any) => React.ReactNode;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ 
  icon, 
  title, 
  data, 
  loading, 
  renderContent 
}) => (
  <div className="card-base rounded-xl p-6 border border-[color:var(--border)] hover:shadow-lg transition-all">
    <div className="flex items-center gap-3 mb-4">
      <div 
        className="p-2 rounded-lg"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
        }}
      >
        {icon}
      </div>
      <h3 className="font-bold text-[color:var(--text-primary)]">{title}</h3>
    </div>
    
    <div className="min-h-[150px]">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <div className="w-8 h-8 border-4 border-[color:var(--primary-500)] border-t-transparent rounded-full animate-spin"></div>
          <div className="text-sm text-[color:var(--text-muted)]">Analyzing...</div>
        </div>
      ) : data ? (
        renderContent(data)
      ) : (
        <div className="flex items-center justify-center py-8">
          <div className="text-center text-[color:var(--text-muted)]">
            No data available
          </div>
        </div>
      )}
    </div>
  </div>
);

/**
 * Metric row component for consistent key-value display
 * 
 * @param label - Metric label
 * @param value - Metric value
 * @param valueColor - Optional Tailwind color class for value
 */
interface MetricRowProps {
  label: string;
  value: string | number;
  valueColor?: string;
}

const MetricRow: React.FC<MetricRowProps> = ({ 
  label, 
  value, 
  valueColor = 'text-[color:var(--text-primary)]' 
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-[color:var(--text-secondary)]">{label}</span>
    <span className={`text-sm font-medium ${valueColor}`}>{value}</span>
  </div>
);

export default TechnicalAnalysisView;
