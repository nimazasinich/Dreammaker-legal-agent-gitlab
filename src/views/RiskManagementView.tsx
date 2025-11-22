/**
 * Risk Management Dashboard
 * 
 * Professional-grade risk analysis and position sizing tools for cryptocurrency trading.
 * Exposes ProfessionalRiskEngine features with interactive calculations and stress testing.
 * 
 * @component
 * @example
 * ```tsx
 * <RiskManagementView />
 * ```
 * 
 * Features:
 * - Liquidation price calculator
 * - Position sizing optimizer
 * - Funding rate analysis
 * - Stress testing scenarios
 * - Real-time risk metrics
 * - Portfolio risk assessment
 * 
 * @since 1.0.0
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { DatasourceClient } from '../services/DatasourceClient';
import { ProfessionalRiskEngine } from '../services/ProfessionalRiskEngine';
import { 
  AlertTriangle, 
  DollarSign, 
  TrendingDown, 
  Shield,
  Activity,
  Target,
  Zap,
  TrendingUp
} from 'lucide-react';

/**
 * Position input form data structure
 */
interface PositionInput {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  size: number;
  leverage: number;
  side: 'LONG' | 'SHORT';
  stopLoss: number;
  accountBalance: number;
  riskPercentage: number;
}

/**
 * Calculated risk metrics structure
 */
interface RiskMetrics {
  liquidationPrice: number;
  liquidationDistance: number;
  optimalPositionSize: number;
  currentRiskAmount: number;
  potentialLoss: number;
  riskRewardRatio: number;
  marginRequired: number;
  stressTests: any[];
}

/**
 * Risk Management Dashboard Component
 * Interactive calculator for position risk analysis
 */
export const RiskManagementView: React.FC = () => {
  const [position, setPosition] = useState<PositionInput>({
    symbol: 'BTCUSDT',
    entryPrice: 0,
    currentPrice: 0,
    size: 0,
    leverage: 10,
    side: 'LONG',
    stopLoss: 0,
    accountBalance: 10000,
    riskPercentage: 2
  });
  
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  /**
   * Fetches current market price for the symbol
   * Uses DatasourceClient for Hub Proxy integration
   */
  const fetchCurrentPrice = async () => {
    setPriceLoading(true);
    try {
      const datasource = DatasourceClient.getInstance();
      const coins = await datasource.getTopCoins(1, [position.symbol.replace('USDT', '')]);
      
      if (coins && coins.length > 0) {
        const price = coins[0].price;
        setPosition(prev => ({
          ...prev,
          currentPrice: price,
          entryPrice: prev.entryPrice || price,
          stopLoss: prev.stopLoss || price * (prev.side === 'LONG' ? 0.95 : 1.05)
        }));
      }
    } catch (err: any) {
      console.error('Failed to fetch price:', err);
    } finally {
      setPriceLoading(false);
    }
  };

  /**
   * Calculates comprehensive risk metrics using ProfessionalRiskEngine
   * Includes liquidation price, optimal position size, and stress tests
   */
  const calculateRisk = async () => {
    if (position.entryPrice === 0 || position.currentPrice === 0) {
      setError('Please enter valid entry and current prices');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const riskEngine = ProfessionalRiskEngine.getInstance();
      
      // Calculate liquidation price
      const liquidationPrice = riskEngine.calculateLiquidationPrice(
        position.entryPrice,
        position.leverage,
        position.side
      );
      
      // Calculate distance to liquidation
      const liquidationDistance = riskEngine.calculateLiquidationDistance(
        position.currentPrice,
        liquidationPrice,
        position.side
      );
      
      // Calculate optimal position size
      const volatility = 5; // Default 5% daily volatility (could fetch real ATR)
      const optimalSize = riskEngine.calculateOptimalPositionSize(
        position.accountBalance,
        position.riskPercentage,
        position.entryPrice,
        position.stopLoss,
        volatility
      );
      
      // Calculate current risk amount
      const currentRiskAmount = position.accountBalance * (position.riskPercentage / 100);
      
      // Calculate potential loss at stop loss
      const potentialLoss = Math.abs(position.entryPrice - position.stopLoss) * position.size;
      
      // Calculate risk/reward ratio (assuming 2:1 target)
      const targetProfit = Math.abs(position.entryPrice - position.stopLoss) * 2;
      const riskRewardRatio = targetProfit / Math.abs(position.entryPrice - position.stopLoss);
      
      // Calculate margin required
      const marginRequired = (position.size * position.entryPrice) / position.leverage;
      
      // Run stress tests
      const stressTests = [
        {
          scenario: 'Flash Crash (-10%)',
          description: 'Sudden 10% price drop',
          priceChange: -10,
          newPrice: position.currentPrice * 0.9,
          pnl: position.side === 'LONG' 
            ? (position.currentPrice * 0.9 - position.entryPrice) * position.size * position.leverage
            : (position.entryPrice - position.currentPrice * 0.9) * position.size * position.leverage,
          liquidated: position.side === 'LONG' 
            ? position.currentPrice * 0.9 <= liquidationPrice
            : position.currentPrice * 0.9 >= liquidationPrice
        },
        {
          scenario: 'Major Correction (-25%)',
          description: 'Market correction of 25%',
          priceChange: -25,
          newPrice: position.currentPrice * 0.75,
          pnl: position.side === 'LONG'
            ? (position.currentPrice * 0.75 - position.entryPrice) * position.size * position.leverage
            : (position.entryPrice - position.currentPrice * 0.75) * position.size * position.leverage,
          liquidated: position.side === 'LONG'
            ? position.currentPrice * 0.75 <= liquidationPrice
            : position.currentPrice * 0.75 >= liquidationPrice
        },
        {
          scenario: 'Rally (+15%)',
          description: 'Strong upward movement',
          priceChange: +15,
          newPrice: position.currentPrice * 1.15,
          pnl: position.side === 'LONG'
            ? (position.currentPrice * 1.15 - position.entryPrice) * position.size * position.leverage
            : (position.entryPrice - position.currentPrice * 1.15) * position.size * position.leverage,
          liquidated: position.side === 'SHORT'
            ? position.currentPrice * 1.15 >= liquidationPrice
            : false
        },
        {
          scenario: 'Extreme Volatility (-40%)',
          description: 'Black swan event',
          priceChange: -40,
          newPrice: position.currentPrice * 0.6,
          pnl: position.side === 'LONG'
            ? (position.currentPrice * 0.6 - position.entryPrice) * position.size * position.leverage
            : (position.entryPrice - position.currentPrice * 0.6) * position.size * position.leverage,
          liquidated: true // Almost certainly liquidated
        }
      ];
      
      setRiskMetrics({
        liquidationPrice,
        liquidationDistance,
        optimalPositionSize: optimalSize,
        currentRiskAmount,
        potentialLoss,
        riskRewardRatio,
        marginRequired,
        stressTests
      });
      
    } catch (err: any) {
      console.error('Risk calculation failed:', err);
      setError(err.message || 'Failed to calculate risk metrics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch price on mount and symbol change
  useEffect(() => {
    if (position.symbol) {
      fetchCurrentPrice();
    }
  }, [position.symbol]);

  // Auto-calculate when inputs change
  useEffect(() => {
    if (position.entryPrice > 0 && position.currentPrice > 0) {
      calculateRisk();
    }
  }, [
    position.entryPrice,
    position.currentPrice,
    position.leverage,
    position.side,
    position.stopLoss,
    position.size,
    position.accountBalance,
    position.riskPercentage
  ]);

  return (
    <div className="min-h-screen bg-[color:var(--surface-page)] p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div 
              className="p-3 rounded-xl shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              }}
            >
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[color:var(--text-primary)]">
                Risk Management Dashboard
              </h1>
              <p className="text-[color:var(--text-secondary)]">
                Professional-grade position sizing and risk analysis
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="card-base bg-red-50 border-2 border-red-500 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="text-red-900 font-bold">Calculation Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Input Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card-base rounded-xl p-6 border border-[color:var(--border)]">
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Position Details
              </h2>
              
              <div className="space-y-4">
                {/* Symbol */}
                <InputField
                  label="Symbol"
                  value={position.symbol}
                  onChange={(v) => setPosition({ ...position, symbol: v.toUpperCase() })}
                  placeholder="BTCUSDT"
                />
                
                {/* Entry Price */}
                <InputField
                  label="Entry Price"
                  type="number"
                  value={position.entryPrice || ''}
                  onChange={(v) => setPosition({ ...position, entryPrice: parseFloat(v) || 0 })}
                  placeholder="0.00"
                  suffix={priceLoading ? 'Loading...' : undefined}
                />
                
                {/* Current Price */}
                <InputField
                  label="Current Price"
                  type="number"
                  value={position.currentPrice || ''}
                  onChange={(v) => setPosition({ ...position, currentPrice: parseFloat(v) || 0 })}
                  placeholder="0.00"
                  disabled={priceLoading}
                />
                
                {/* Position Size */}
                <InputField
                  label="Position Size (Contracts)"
                  type="number"
                  value={position.size || ''}
                  onChange={(v) => setPosition({ ...position, size: parseFloat(v) || 0 })}
                  placeholder="0.00"
                />
                
                {/* Leverage Slider */}
                <div>
                  <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">
                    Leverage: {position.leverage}x
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="125"
                    value={position.leverage}
                    onChange={(e) => setPosition({ ...position, leverage: parseInt(e.target.value) })}
                    className="w-full accent-[color:var(--primary-500)]"
                  />
                  <div className="flex justify-between text-xs text-[color:var(--text-muted)] mt-1">
                    <span>1x</span>
                    <span>50x</span>
                    <span>125x</span>
                  </div>
                </div>
                
                {/* Position Side */}
                <div>
                  <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">
                    Position Side
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPosition({ ...position, side: 'LONG' })}
                      className={`py-2 rounded-lg font-bold transition-all ${
                        position.side === 'LONG'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-emerald-50'
                      }`}
                    >
                      LONG
                    </button>
                    <button
                      onClick={() => setPosition({ ...position, side: 'SHORT' })}
                      className={`py-2 rounded-lg font-bold transition-all ${
                        position.side === 'SHORT'
                          ? 'bg-red-600 text-white shadow-md'
                          : 'bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] hover:bg-red-50'
                      }`}
                    >
                      SHORT
                    </button>
                  </div>
                </div>
                
                {/* Stop Loss */}
                <InputField
                  label="Stop Loss Price"
                  type="number"
                  value={position.stopLoss || ''}
                  onChange={(v) => setPosition({ ...position, stopLoss: parseFloat(v) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Account Settings */}
            <div className="card-base rounded-xl p-6 border border-[color:var(--border)]">
              <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Account Settings
              </h2>
              
              <div className="space-y-4">
                <InputField
                  label="Account Balance"
                  type="number"
                  value={position.accountBalance || ''}
                  onChange={(v) => setPosition({ ...position, accountBalance: parseFloat(v) || 0 })}
                  placeholder="10000.00"
                  prefix="$"
                />
                
                <div>
                  <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">
                    Risk Per Trade: {position.riskPercentage}%
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={position.riskPercentage}
                    onChange={(e) => setPosition({ ...position, riskPercentage: parseFloat(e.target.value) })}
                    className="w-full accent-[color:var(--primary-500)]"
                  />
                  <div className="flex justify-between text-xs text-[color:var(--text-muted)] mt-1">
                    <span>0.5%</span>
                    <span>5%</span>
                    <span>10%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Risk Metrics */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Metrics Grid */}
            {riskMetrics && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  
                  {/* Liquidation Price */}
                  <MetricCard
                    icon={<AlertTriangle className="w-6 h-6" />}
                    title="Liquidation Price"
                    value={`$${riskMetrics.liquidationPrice.toFixed(2)}`}
                    subtitle={`${Math.abs(riskMetrics.liquidationDistance).toFixed(2)}% away`}
                    color={riskMetrics.liquidationDistance > 10 ? 'green' : riskMetrics.liquidationDistance > 5 ? 'yellow' : 'red'}
                  />
                  
                  {/* Optimal Position Size */}
                  <MetricCard
                    icon={<Target className="w-6 h-6" />}
                    title="Optimal Size"
                    value={riskMetrics.optimalPositionSize.toFixed(2)}
                    subtitle="Based on 2% risk rule"
                    color="blue"
                  />
                  
                  {/* Margin Required */}
                  <MetricCard
                    icon={<DollarSign className="w-6 h-6" />}
                    title="Margin Required"
                    value={`$${riskMetrics.marginRequired.toFixed(2)}`}
                    subtitle={`${((riskMetrics.marginRequired / position.accountBalance) * 100).toFixed(1)}% of balance`}
                    color="purple"
                  />
                  
                  {/* Risk/Reward Ratio */}
                  <MetricCard
                    icon={<Activity className="w-6 h-6" />}
                    title="Risk/Reward"
                    value={`1:${riskMetrics.riskRewardRatio.toFixed(1)}`}
                    subtitle={riskMetrics.riskRewardRatio >= 2 ? 'Good ratio' : 'Poor ratio'}
                    color={riskMetrics.riskRewardRatio >= 2 ? 'green' : 'yellow'}
                  />
                  
                </div>

                {/* Detailed Risk Analysis */}
                <div className="card-base rounded-xl p-6 border border-[color:var(--border)]">
                  <h3 className="text-lg font-bold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Detailed Risk Analysis
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-[color:var(--surface-muted)]">
                      <div className="text-sm text-[color:var(--text-secondary)] mb-1">Current Risk Amount</div>
                      <div className="text-2xl font-bold text-[color:var(--text-primary)]">
                        ${riskMetrics.currentRiskAmount.toFixed(2)}
                      </div>
                      <div className="text-xs text-[color:var(--text-muted)] mt-1">
                        {position.riskPercentage}% of ${position.accountBalance.toFixed(0)}
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-[color:var(--surface-muted)]">
                      <div className="text-sm text-[color:var(--text-secondary)] mb-1">Potential Loss at SL</div>
                      <div className="text-2xl font-bold text-red-600">
                        -${riskMetrics.potentialLoss.toFixed(2)}
                      </div>
                      <div className="text-xs text-[color:var(--text-muted)] mt-1">
                        If stop loss is hit
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-[color:var(--surface-muted)]">
                      <div className="text-sm text-[color:var(--text-secondary)] mb-1">Position Value</div>
                      <div className="text-2xl font-bold text-[color:var(--text-primary)]">
                        ${(position.size * position.entryPrice).toFixed(2)}
                      </div>
                      <div className="text-xs text-[color:var(--text-muted)] mt-1">
                        {position.size} contracts @ ${position.entryPrice.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="p-4 rounded-lg bg-[color:var(--surface-muted)]">
                      <div className="text-sm text-[color:var(--text-secondary)] mb-1">Leverage Factor</div>
                      <div className="text-2xl font-bold text-[color:var(--text-primary)]">
                        {position.leverage}x
                      </div>
                      <div className="text-xs text-[color:var(--text-muted)] mt-1">
                        {position.leverage > 20 ? 'Very High Risk' : position.leverage > 10 ? 'High Risk' : 'Moderate Risk'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stress Test Results */}
                <div className="card-base rounded-xl p-6 border border-[color:var(--border)]">
                  <h3 className="text-lg font-bold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Stress Test Scenarios
                  </h3>
                  
                  <div className="space-y-3">
                    {riskMetrics.stressTests.map((test, idx) => (
                      <div 
                        key={idx}
                        className={`p-4 rounded-lg border-2 ${
                          test.liquidated 
                            ? 'bg-red-50 border-red-500' 
                            : test.pnl < 0
                            ? 'bg-yellow-50 border-yellow-500'
                            : 'bg-green-50 border-green-500'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-bold text-gray-900">{test.scenario}</div>
                            <div className="text-sm text-gray-600">{test.description}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${
                              test.priceChange >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {test.priceChange >= 0 ? '+' : ''}{test.priceChange}%
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div>
                            <div className="text-xs text-gray-600">New Price</div>
                            <div className="text-sm font-medium text-gray-900">
                              ${test.newPrice.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">P&L</div>
                            <div className={`text-sm font-bold ${
                              test.pnl >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {test.pnl >= 0 ? '+' : ''}${test.pnl.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Liquidated</div>
                            <div className={`text-sm font-bold ${
                              test.liquidated ? 'text-red-700' : 'text-green-700'
                            }`}>
                              {test.liquidated ? 'YES' : 'NO'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Loading State */}
            {!riskMetrics && !error && (
              <div className="card-base rounded-xl p-12 border border-[color:var(--border)] text-center">
                <div className="flex flex-col items-center gap-4">
                  <Shield className="w-16 h-16 text-[color:var(--text-muted)]" />
                  <div>
                    <h3 className="text-xl font-bold text-[color:var(--text-primary)]">
                      Ready for Risk Analysis
                    </h3>
                    <p className="text-[color:var(--text-secondary)] mt-2">
                      Enter your position details to calculate risk metrics
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Input field component with consistent styling
 * 
 * @param label - Field label
 * @param type - Input type (text, number, etc.)
 * @param value - Current value
 * @param onChange - Change handler
 * @param placeholder - Placeholder text
 * @param prefix - Optional prefix text (e.g., "$")
 * @param suffix - Optional suffix text
 * @param disabled - Whether input is disabled
 */
interface InputFieldProps {
  label: string;
  type?: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder,
  prefix,
  suffix,
  disabled = false
}) => (
  <div>
    <label className="block text-sm font-medium text-[color:var(--text-secondary)] mb-2">
      {label}
    </label>
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-secondary)]">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-[color:var(--surface)] text-[color:var(--text-primary)] px-4 py-2 rounded-lg border border-[color:var(--border)] focus:border-[color:var(--primary-500)] focus:outline-none transition-colors ${
          prefix ? 'pl-8' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        step={type === 'number' ? '0.01' : undefined}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[color:var(--text-muted)]">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

/**
 * Metric card component for displaying key risk metrics
 * 
 * @param icon - Lucide React icon
 * @param title - Metric title
 * @param value - Metric value
 * @param subtitle - Additional context
 * @param color - Color theme (red, green, blue, yellow, purple)
 */
interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: 'red' | 'green' | 'blue' | 'yellow' | 'purple';
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, subtitle, color }) => {
  const colorClasses = {
    red: 'from-red-500 to-red-600',
    green: 'from-emerald-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    yellow: 'from-yellow-500 to-amber-600',
    purple: 'from-purple-500 to-violet-600',
  };

  const bgColorClasses = {
    red: 'bg-red-50',
    green: 'bg-green-50',
    blue: 'bg-blue-50',
    yellow: 'bg-yellow-50',
    purple: 'bg-purple-50',
  };

  return (
    <div className={`card-base rounded-xl p-6 border border-[color:var(--border)] ${bgColorClasses[color]}`}>
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="p-2 rounded-lg text-white"
          style={{
            background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
          }}
          tw-gradient-stops={colorClasses[color]}
        >
          {icon}
        </div>
        <div className="text-sm font-medium text-gray-700">{title}</div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-600 mt-1">{subtitle}</div>
    </div>
  );
};

export default RiskManagementView;
