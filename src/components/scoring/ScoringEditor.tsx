/**
 * SCORING EDITOR COMPONENT
 * Executive Control Panel for Quantum Scoring System
 */

import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import DatasourceClient from '../../services/DatasourceClient';
import { showToast } from '../ui/Toast';
import { useConfirmModal } from '../ui/ConfirmModal';

interface DetectorWeights {
  technical_analysis: {
    harmonic: number;
    elliott: number;
    fibonacci: number;
    price_action: number;
    smc: number;
    sar: number;
  };
  fundamental_analysis: {
    sentiment: number;
    news: number;
    whales: number;
  };
}

interface TimeframeWeights {
  [key: string]: number;
}

interface ScoringSnapshot {
  timestamp: string;
  symbol: string;
  judicialProceedings: {
    supremeVerdict: {
      direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      quantumScore: number;
      action: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
      conviction: number;
    };
    timeframeCourts: Array<{
      tf: string;
      direction: string;
      final_score: number;
    }>;
  };
  detectorPerformance: Array<{
    detector: string;
    currentScore: number;
    historicalAccuracy: number;
    confidenceLevel: number;
  }>;
}


const logger = Logger.getInstance();

export const ScoringEditor: React.FC = () => {
  const { confirm, ModalComponent } = useConfirmModal();
  const [detectorWeights, setDetectorWeights] = useState<DetectorWeights>({
    technical_analysis: {
      harmonic: 0.15,
      elliott: 0.15,
      fibonacci: 0.10,
      price_action: 0.15,
      smc: 0.20,
      sar: 0.10
    },
    fundamental_analysis: {
      sentiment: 0.10,
      news: 0.03,
      whales: 0.02
    }
  });

  const [timeframeWeights, setTimeframeWeights] = useState<TimeframeWeights>({
    '5m': 0.15,
    '15m': 0.25,
    '1h': 0.30,
    '4h': 0.20,
    '1d': 0.10
  });

  const [snapshot, setSnapshot] = useState<ScoringSnapshot | null>(null);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeights();
  }, []);

  const loadWeights = async () => {
    try {
      // Load scoring weights from backend via DatasourceClient
      const weights = await DatasourceClient.getScoringWeights();
      if (weights) {
        setDetectorWeights({
          technical_analysis: weights.detector_weights.technical_analysis as any,
          fundamental_analysis: weights.detector_weights.fundamental_analysis as any
        });
        setTimeframeWeights(weights.timeframe_weights);
      }
    } catch (err) {
      if (import.meta.env.DEV) logger.error('Failed to load weights', {}, err);
    }
  };

  const loadSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load scoring snapshot from backend via DatasourceClient
      const snapshotData = await DatasourceClient.getScoringSnapshot(symbol);
      if (snapshotData) {
        setSnapshot(snapshotData as any);
        setError(null);
      } else {
        setError('No scoring data available for this symbol. The backend may still be processing data.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load snapshot');
    } finally {
      setLoading(false);
    }
  };

  const updateWeights = async () => {
    setLoading(true);
    setError(null);
    try {
      // Update scoring weights on backend via DatasourceClient
      const weights = {
        detector_weights: {
          technical_analysis: detectorWeights.technical_analysis as any,
          fundamental_analysis: detectorWeights.fundamental_analysis as any
        },
        timeframe_weights: timeframeWeights
      };
      const success = await DatasourceClient.updateScoringWeights(weights);
      if (success) {
        showToast('success', 'Success', 'Scoring weights updated successfully');
        await loadWeights();
      } else {
        showToast('error', 'Failed', 'Failed to update scoring weights on backend');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update weights');
    } finally {
      setLoading(false);
    }
  };

  const resetWeights = async () => {
    const confirmed = await confirm(
      'Reset Weights',
      'Are you sure you want to reset all weights to defaults?',
      'warning'
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      // Reset scoring weights on backend via DatasourceClient
      const success = await DatasourceClient.resetScoringWeights();
      if (success) {
        await loadWeights(); // Reload weights from backend
        showToast('success', 'Reset Complete', 'Weights reset to defaults on backend');
      } else {
        showToast('error', 'Failed', 'Failed to reset weights on backend');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset weights');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score > 0.5) return 'text-green-600';
    if (score < -0.5) return 'text-red-600';
    return 'text-gray-600';
  };

  const getActionBadgeColor = (action: string): string => {
    switch (action) {
      case 'STRONG_BUY': return 'bg-green-700 text-white';
      case 'BUY': return 'bg-green-500 text-white';
      case 'HOLD': return 'bg-gray-500 text-white';
      case 'SELL': return 'bg-red-500 text-white';
      case 'STRONG_SELL': return 'bg-red-700 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  return (
    <>
      <ModalComponent />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Quantum Scoring System</h1>
        <div className="flex gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol (e.g., BTCUSDT)"
            className="px-4 py-2 border rounded"
          />
          <button
            type="button"
            onClick={loadSnapshot}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-all duration-200"
          >
            <span className="flex items-center gap-2">
              {loading && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span className={loading ? 'opacity-70' : ''}>
                {loading ? 'Loading Snapshot' : 'Load Snapshot'}
              </span>
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Snapshot Display */}
      {snapshot && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Supreme Verdict</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-600">Quantum Score</div>
              <div className={`text-3xl font-bold ${getScoreColor(snapshot.judicialProceedings.supremeVerdict.quantumScore)}`}>
                {snapshot.judicialProceedings.supremeVerdict.quantumScore.toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Action</div>
              <div className={`inline-block px-4 py-2 rounded ${getActionBadgeColor(snapshot.judicialProceedings.supremeVerdict.action)}`}>
                {snapshot.judicialProceedings.supremeVerdict.action}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Direction</div>
              <div className="text-xl font-semibold">{snapshot.judicialProceedings.supremeVerdict.direction}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Conviction</div>
              <div className="text-xl font-semibold">{(snapshot.judicialProceedings.supremeVerdict.conviction * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Timeframe Analysis</h3>
            <div className="space-y-2">
              {(snapshot.judicialProceedings.timeframeCourts || []).map(tf => (
                <div key={tf.tf} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="font-medium">{tf.tf}</span>
                  <span className={getScoreColor(tf.final_score)}>
                    {tf.final_score.toFixed(3)} ({tf.direction})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Detector Performance</h3>
            <div className="grid grid-cols-3 gap-4">
              {(snapshot.detectorPerformance || []).map(perf => (
                <div key={perf.detector} className="p-3 bg-gray-50 rounded">
                  <div className="font-medium">{perf.detector}</div>
                  <div className="text-sm text-gray-600">
                    Accuracy: {(perf.historicalAccuracy * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">
                    Confidence: {(perf.confidenceLevel * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weight Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Weights Parliament</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={updateWeights}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Update Weights
            </button>
            <button
              type="button"
              onClick={resetWeights}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Technical Analysis Weights */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Technical Analysis</h3>
            <div className="space-y-3">
              {Object.entries(detectorWeights.technical_analysis).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-32 text-sm capitalize">{key.replace('_', ' ')}</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={value}
                    onChange={(e) => setDetectorWeights({
                      ...detectorWeights,
                      technical_analysis: {
                        ...detectorWeights.technical_analysis,
                        [key]: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="flex-1 px-3 py-1 border rounded"
                  />
                  <span className="text-sm text-gray-600 w-12">{(value * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fundamental Analysis Weights */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Fundamental Analysis</h3>
            <div className="space-y-3">
              {Object.entries(detectorWeights.fundamental_analysis).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-32 text-sm capitalize">{key}</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={value}
                    onChange={(e) => setDetectorWeights({
                      ...detectorWeights,
                      fundamental_analysis: {
                        ...detectorWeights.fundamental_analysis,
                        [key]: parseFloat(e.target.value) || 0
                      }
                    })}
                    className="flex-1 px-3 py-1 border rounded"
                  />
                  <span className="text-sm text-gray-600 w-12">{(value * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeframe Weights */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Timeframe Weights</h3>
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(timeframeWeights).map(([tf, weight]) => (
              <div key={tf} className="flex flex-col gap-2">
                <label className="text-sm font-medium">{tf}</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={weight}
                  onChange={(e) => setTimeframeWeights({
                    ...timeframeWeights,
                    [tf]: parseFloat(e.target.value) || 0
                  })}
                  className="px-3 py-1 border rounded"
                />
                <span className="text-xs text-gray-600">{(weight * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </>
  );
};
