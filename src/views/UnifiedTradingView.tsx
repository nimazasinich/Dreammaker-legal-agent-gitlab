import React from 'react';
import { TrendingUp } from 'lucide-react';

// Import existing trading views - do not modify these files
import { FuturesTradingView } from './FuturesTradingView';
import { ExchangeSelector } from '../components/ExchangeSelector';

/**
 * UnifiedTradingView - Futures-Only Trading Interface
 * 
 * This is a Futures-only build. SPOT trading is not implemented.
 * See docs/PRODUCTION_READINESS_CHECKLIST.md for rationale.
 */
export default function UnifiedTradingView() {
  return (
    <section className="w-full grid gap-4">
      <header className="trading-header card p-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--primary-600)] to-[var(--primary-400)] bg-clip-text text-transparent">
            Futures Trading Platform
          </h2>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">
            Professional leveraged trading with real-time execution
          </p>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-600)] text-white rounded-lg shadow-lg">
          <TrendingUp className="w-5 h-5" />
          <span className="font-semibold">Futures Trading</span>
        </div>
      </header>

      {/* Exchange Selector */}
      <div className="mb-4">
        <ExchangeSelector />
      </div>

      {/* Futures Trading Interface */}
      <FuturesTradingView />
    </section>
  );
}
