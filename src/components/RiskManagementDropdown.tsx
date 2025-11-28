import React, { useState } from 'react';
import { Shield, ChevronDown, AlertTriangle, DollarSign, Percent, TrendingDown } from 'lucide-react';

interface RiskSettings {
  maxPositionSize: number;
  maxLeverage: number;
  stopLoss: number;
  takeProfit: number;
  maxDailyLoss: number;
  maxOpenPositions: number;
}

const DEFAULT_RISK_SETTINGS: RiskSettings = {
  maxPositionSize: 500,    // USDT
  maxLeverage: 3,          // 3x
  stopLoss: 2.0,           // 2%
  takeProfit: 4.0,         // 4%
  maxDailyLoss: 150,       // USDT
  maxOpenPositions: 5,
};

export const RiskManagementDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<RiskSettings>(DEFAULT_RISK_SETTINGS);

  const handleChange = (key: keyof RiskSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // Save settings to localStorage or backend
    localStorage.setItem('riskSettings', JSON.stringify(settings));
    alert('Risk settings saved successfully!');
    setIsOpen(false);
  };

  const handleReset = () => {
    setSettings(DEFAULT_RISK_SETTINGS);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20">
            <Shield className="h-5 w-5 text-orange-400" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-text-base">Risk Management Settings</h3>
            <p className="text-sm text-text-muted">Configure position limits, leverage, and stop-loss</p>
          </div>
        </div>
        <ChevronDown 
          className={`h-5 w-5 text-text-secondary transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="border-t border-border px-6 py-6 space-y-6">
          {/* Position & Leverage Settings */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Max Position Size */}
            <label className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                <DollarSign className="h-4 w-4" />
                <span>Max Position Size (USDT)</span>
              </div>
              <input
                type="number"
                className="input-field w-full"
                value={settings.maxPositionSize}
                onChange={(e) => handleChange('maxPositionSize', Number(e.target.value))}
                min={10}
                max={10000}
                step={10}
              />
              <p className="text-xs text-text-muted">Maximum amount per position</p>
            </label>

            {/* Max Leverage */}
            <label className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                <TrendingDown className="h-4 w-4" />
                <span>Max Leverage</span>
              </div>
              <input
                type="number"
                className="input-field w-full"
                value={settings.maxLeverage}
                onChange={(e) => handleChange('maxLeverage', Number(e.target.value))}
                min={1}
                max={100}
                step={1}
              />
              <p className="text-xs text-text-muted">Maximum leverage multiplier (1x-100x)</p>
            </label>
          </div>

          {/* Stop Loss & Take Profit */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Stop Loss */}
            <label className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                <AlertTriangle className="h-4 w-4" />
                <span>Stop Loss (%)</span>
              </div>
              <input
                type="number"
                className="input-field w-full"
                value={settings.stopLoss}
                onChange={(e) => handleChange('stopLoss', Number(e.target.value))}
                min={0.1}
                max={100}
                step={0.1}
              />
              <p className="text-xs text-text-muted">Percentage loss before auto-exit</p>
            </label>

            {/* Take Profit */}
            <label className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                <Percent className="h-4 w-4" />
                <span>Take Profit (%)</span>
              </div>
              <input
                type="number"
                className="input-field w-full"
                value={settings.takeProfit}
                onChange={(e) => handleChange('takeProfit', Number(e.target.value))}
                min={0.1}
                max={1000}
                step={0.1}
              />
              <p className="text-xs text-text-muted">Percentage gain before auto-exit</p>
            </label>
          </div>

          {/* Daily Limits */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Max Daily Loss */}
            <label className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                <DollarSign className="h-4 w-4" />
                <span>Max Daily Loss (USDT)</span>
              </div>
              <input
                type="number"
                className="input-field w-full"
                value={settings.maxDailyLoss}
                onChange={(e) => handleChange('maxDailyLoss', Number(e.target.value))}
                min={10}
                max={10000}
                step={10}
              />
              <p className="text-xs text-text-muted">Daily loss limit before stopping</p>
            </label>

            {/* Max Open Positions */}
            <label className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                <Shield className="h-4 w-4" />
                <span>Max Open Positions</span>
              </div>
              <input
                type="number"
                className="input-field w-full"
                value={settings.maxOpenPositions}
                onChange={(e) => handleChange('maxOpenPositions', Number(e.target.value))}
                min={1}
                max={20}
                step={1}
              />
              <p className="text-xs text-text-muted">Maximum concurrent positions</p>
            </label>
          </div>

          {/* Risk Summary */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-text-base">Current Risk Profile</p>
                <ul className="space-y-1 text-text-secondary">
                  <li>• Max position: ${settings.maxPositionSize} USDT</li>
                  <li>• Leverage: {settings.maxLeverage}x</li>
                  <li>• Stop loss: {settings.stopLoss}%</li>
                  <li>• Take profit: {settings.takeProfit}%</li>
                  <li>• Daily loss limit: ${settings.maxDailyLoss} USDT</li>
                  <li>• Max positions: {settings.maxOpenPositions}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-white/5 transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-lg"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
