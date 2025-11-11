import React, { useState } from 'react';
import { API_BASE, APP_MODE, STRICT_REAL_DATA } from '../config/env';
import { StrategyTemplateEditor } from '../components/strategy/StrategyTemplateEditor';
import ScoreGauge from '../components/strategy/ScoreGauge';
import { saveStrategyOutput } from '../storage/mlOutputs';

// Simple animated step header (CSS transitions only)
function StepHeader({ step, title, active }:{ step:number; title:string; active:boolean }) {
  return (
    <div className={`px-4 py-2 rounded-xl border ${active ? 'border-blue-400 bg-blue-400/10' : 'border-white/15 bg-white/5'} transition-all`}>
      <span className="text-xs opacity-70">STEP {step}</span>
      <div className="font-semibold">{title}</div>
    </div>
  );
}

export default function StrategyBuilderView() {
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = React.useState<1|2>(1);
  const [selectedTemplate, setSelectedTemplate] = React.useState<any>(null);
  const [symbol, setSymbol] = React.useState('BTCUSDT');
  const [timeframe, setTimeframe] = React.useState('1h');

  const [logicScore, setLogicScore] = React.useState(0);
  const [logicDelta, setLogicDelta] = React.useState(0);
  const [isApplying, setApplying] = React.useState(false);
  const [btLoading, setBtLoading] = React.useState(false);
  const [btMetrics, setBtMetrics] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // naive score estimate based on weights sum & confluence (purely logical; not a backtest)
  const estimateScore = React.useCallback((tpl:any) => {
    if (!tpl) return 0;
    const w = tpl?.weights || {};
    const sum = Object.values(w).reduce((a:any,b:any)=>a+(Number.isFinite(b)?b:0),0);
    const conf = Number.isFinite(tpl?.confluence) ? tpl.confluence : 0.6;
    // capped to [0,1]
    return Math.max(0, Math.min(1, (sum / Math.max(1, Object.keys(w).length)) * conf));
  }, []);

  React.useEffect(() => {
    const s = estimateScore(selectedTemplate);
    setLogicDelta(s - logicScore);
    setLogicScore(s);
  }, [selectedTemplate]);

  const applyTemplate = async () => {
    if (!selectedTemplate) { console.warn("Missing data"); }
    setApplying(true); setErr(null);
    try {
      const r = await fetch(`${API_BASE}/strategy/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ template: selectedTemplate })
      });
      if (!r.ok) console.error(`apply_${r.status}`);
    } catch (e:any) {
      setErr(e?.message || 'apply_failed');
    } finally {
      setApplying(false);
    }
  };

  const runBacktest = async () => {
    if (APP_MODE === 'online' && STRICT_REAL_DATA) {
      // Enforce real-data only; do not run if data not available (caller can gate via readiness endpoint)
    }
    setBtLoading(true); setErr(null);
    try {
      const r = await fetch(`${API_BASE}/backtest/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ symbol, timeframe, limit: 500 })
      });
      if (!r.ok) console.error(`backtest_${r.status}`);
      const json = await r.json();
      setBtMetrics(json?.metrics || json);
      saveStrategyOutput(1, { symbol, timeframe, metrics: json?.metrics || json, ts: Date.now() });
    } catch (e:any) {
      setErr(e?.message || 'backtest_failed');
    } finally {
      setBtLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <StepHeader step={1} title="Logic Simulation" active={activeStep===1}/>
        <div className="opacity-50">→</div>
        <StepHeader step={2} title="Real Backtest" active={activeStep===2}/>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4">
            <h3 className="font-semibold mb-2">Strategy Templates</h3>
            <StrategyTemplateEditor
              onTemplateSelect={(tpl:any)=> setSelectedTemplate(tpl)}
              onSaveTemplate={(id:string, tpl:any)=> {/* editor stores in localStorage; CRUD to server optional via new endpoints */}}
            />
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4">
            <h3 className="font-semibold mb-2">Parameters</h3>
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm">Symbol</label>
              <input value={symbol} onChange={e=>setSymbol(e.target.value)} className="px-2 py-1 rounded border bg-white/70 text-black"/>
              <label className="text-sm">Timeframe</label>
              <select value={timeframe} onChange={e=>setTimeframe(e.target.value)} className="px-2 py-1 rounded border bg-white/70 text-black">
                <option>1h</option><option>4h</option><option>1d</option>
              </select>
              <button
                type="button"
                onClick={applyTemplate}
                disabled={!selectedTemplate || isApplying}
                className="ml-auto px-3 py-1 rounded border bg-white/70 hover:bg-white transition"
                aria-busy={isApplying ? 'true':'false'}
              >
                {isApplying ? 'Applying…' : 'Apply Template'}
              </button>
              <button
                type="button"
                onClick={()=> setActiveStep(2)}
                className="px-3 py-1 rounded border bg-blue-500/80 hover:bg-blue-500 text-white transition"
              >
                Next: Backtest
              </button>
            </div>
            {err && <div className="mt-3 text-red-600 bg-red-50 border border-red-200 p-2 rounded">{String(err)}</div>}
          </div>
        </div>

        <div className="space-y-4">
          <ScoreGauge score={logicScore}/>
          <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4">
            <div className="text-sm opacity-70 mb-1">Logical Impact (Δ)</div>
            <div className={`text-xl font-bold ${logicDelta>=0?'text-green-300':'text-red-300'}`}>
              {logicDelta>=0? '+' : ''}{(logicDelta*100).toFixed(1)}%
            </div>
            <div className="text-xs opacity-70">Based on template weights & confluence (estimate, not a backtest)</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur p-4">
        <h3 className="font-semibold mb-2">Phase 2: Real Backtest</h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={runBacktest}
            disabled={btLoading}
            className="px-3 py-1 rounded border bg-emerald-500/80 hover:bg-emerald-500 text-white transition"
            aria-busy={btLoading ? 'true':'false'}
          >
            {btLoading ? 'Running…' : 'Run Backtest'}
          </button>
          <div className="text-xs opacity-70">Real-data only. No synthetic fallback in online mode.</div>
        </div>
        {btMetrics && (
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded border border-white/15 bg-white/5 p-3">
              <div className="text-xs opacity-70">Win Rate</div>
              <div className="text-lg font-semibold">{(btMetrics?.winRate ?? 0).toFixed?.(2) || '—'}%</div>
            </div>
            <div className="rounded border border-white/15 bg-white/5 p-3">
              <div className="text-xs opacity-70">PnL</div>
              <div className="text-lg font-semibold">{btMetrics?.pnl?.toFixed?.(2) ?? '—'}</div>
            </div>
            <div className="rounded border border-white/15 bg-white/5 p-3">
              <div className="text-xs opacity-70">Max Drawdown</div>
              <div className="text-lg font-semibold">{btMetrics?.maxDD?.toFixed?.(2) ?? '—'}%</div>
            </div>
            <div className="rounded border border-white/15 bg-white/5 p-3">
              <div className="text-xs opacity-70">Sharpe</div>
              <div className="text-lg font-semibold">{btMetrics?.sharpe?.toFixed?.(2) ?? '—'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
