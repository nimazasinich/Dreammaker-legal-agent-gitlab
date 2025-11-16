import React, { useState, useEffect } from 'react';
import { ExchangeCredential } from '../types/index';
import { showToast } from '../components/ui/Toast';
import { useConfirmModal } from '../components/ui/ConfirmModal';
import { Logger } from '../core/Logger';

const logger = Logger.getInstance();

/**
 * Exchange capability flags - reflects actual implementation status
 * Currently only KuCoin Futures supports real trading operations
 */
const EXCHANGE_CAPABILITIES = {
  kucoin: { name: 'KuCoin Futures', tradingEnabled: true, description: 'Trading Enabled (Testnet)' },
  binance: { name: 'Binance', tradingEnabled: false, description: 'Data Only' },
  okx: { name: 'OKX', tradingEnabled: false, description: 'Data Only' },
  bybit: { name: 'Bybit', tradingEnabled: false, description: 'Data Only' }
} as const;

type SupportedExchange = keyof typeof EXCHANGE_CAPABILITIES;

export const ExchangeSettingsView: React.FC = () => {
  const { confirm, ModalComponent } = useConfirmModal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exchanges, setExchanges] = useState<ExchangeCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    loadExchanges();
  }, []);

  const loadExchanges = async () => {
    try {
      const response = await fetch('/api/settings/exchanges', { mode: "cors", headers: { "Content-Type": "application/json" } });
      const data = await response.json();
      if (data.success) {
        setExchanges(data.exchanges || []);
      }
    } catch (error) {
      logger.error('Failed to load exchanges:', {}, error as Error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/exchanges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchanges })
      });
      const data = await response.json();
      if (data.success) {
        showToast('success', 'Success', 'Exchanges saved successfully!');
      } else {
        showToast('error', 'Save Failed', 'Failed to save exchanges: ' + data.error);
      }
    } catch (error) {
      showToast('error', 'Save Failed', 'Failed to save exchanges: ' + (error as Error).message);
    }
    setLoading(false);
  };

  const handleAddExchange = () => {
    setExchanges([
      ...exchanges,
      {
        exchange: 'kucoin',
        apiKey: '',
        secret: '',
        passphrase: '',
        isDefault: exchanges.length === 0
      }
    ]);
  };

  const handleRemoveExchange = async (index: number) => {
    const confirmed = await confirm(
      'Remove Exchange',
      'Are you sure you want to remove this exchange?',
      'danger'
    );
    if (confirmed) {
      const newExchanges = exchanges.filter((_, i) => i !== index);
      // If removed exchange was default, set first one as default
      if (exchanges[index].isDefault && (newExchanges?.length || 0) > 0) {
        newExchanges[0].isDefault = true;
      }
      setExchanges(newExchanges);
    }
  };

  const handleSetDefault = (index: number) => {
    const newExchanges = (exchanges || []).map((ex, i) => ({
      ...ex,
      isDefault: i === index
    }));
    setExchanges(newExchanges);
  };

  const handleUpdateExchange = (index: number, field: keyof ExchangeCredential, value: any) => {
    const newExchanges = [...exchanges];
    newExchanges[index] = { ...newExchanges[index], [field]: value };
    setExchanges(newExchanges);
  };

  const toggleEdit = (index: number) => {
    setEditingIndex(editingIndex === index ? null : index);
  };

  return (
    <>
      <ModalComponent />
      <div className="min-h-screen bg-surface p-6">
        <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[color:var(--text-primary)]">Exchange Settings</h1>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`px-6 py-3 rounded-lg font-bold text-white transition-all ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg'
            }`}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Trading Capability Notice */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚡</div>
            <div>
              <p className="text-sm font-semibold text-green-900 mb-1">
                Trading Provider: KuCoin Futures (Testnet)
              </p>
              <p className="text-xs text-green-700">
                Only <strong>KuCoin Futures</strong> supports real trading in this build. Other exchanges are available for data only.
              </p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> API keys are stored locally. You can add multiple exchanges for data, 
            but only KuCoin Futures can execute trades.
          </p>
        </div>

        {/* Exchanges List */}
        <div className="space-y-4">
          {(exchanges || []).map((exchange, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-800 capitalize">
                    {exchange.exchange}
                  </h3>
                  {exchange.isDefault && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                      DEFAULT
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleEdit(index)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-all"
                  >
                    {editingIndex === index ? 'Done' : 'Edit'}
                  </button>
                  {!exchange.isDefault && (
                    <button
                      onClick={() => handleSetDefault(index)}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-all"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveExchange(index)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {editingIndex === index && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  {/* Exchange Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Exchange</label>
                    <select
                      value={exchange.exchange}
                      onChange={(e) => handleUpdateExchange(index, 'exchange', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="kucoin">KuCoin Futures (⚡ Trading Enabled)</option>
                      <option value="binance">Binance (📊 Data Only)</option>
                      <option value="okx">OKX (📊 Data Only)</option>
                      <option value="bybit">Bybit (📊 Data Only)</option>
                    </select>
                    {exchange.exchange !== 'kucoin' && (
                      <p className="mt-2 text-xs text-yellow-600">
                        ⚠️ This exchange is configured for data only. Only KuCoin Futures can execute trades.
                      </p>
                    )}
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">API Key</label>
                    <input
                      type="text"
                      value={exchange.apiKey}
                      onChange={(e) => handleUpdateExchange(index, 'apiKey', e.target.value)}
                      placeholder="Enter API Key"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                    />
                  </div>

                  {/* Secret */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Secret</label>
                    <input
                      type="password"
                      value={exchange.secret}
                      onChange={(e) => handleUpdateExchange(index, 'secret', e.target.value)}
                      placeholder="Enter Secret"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                    />
                  </div>

                  {/* Passphrase (KuCoin, OKX) */}
                  {(exchange.exchange === 'kucoin' || exchange.exchange === 'okx') && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Passphrase {exchange.exchange === 'kucoin' && '(KuCoin)'}
                      </label>
                      <input
                        type="password"
                        value={exchange.passphrase || ''}
                        onChange={(e) => handleUpdateExchange(index, 'passphrase', e.target.value)}
                        placeholder="Enter Passphrase"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Exchange Button */}
        <button
          onClick={handleAddExchange}
          className="w-full mt-6 px-6 py-4 bg-green-500 text-white rounded-2xl font-bold hover:bg-green-600 transition-all shadow-lg"
        >
          + Add Exchange
        </button>
        </div>
      </div>
    </>
  );
};

export default ExchangeSettingsView;
