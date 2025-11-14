import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DataMode,
  TradingMode,
  DataSourceType,
  ModeState,
  DEFAULT_MODE,
  parseDataMode,
  parseTradingMode,
  parseDataSource,
} from '../types/modes';
import { readJSON, writeJSON } from '../lib/storage';

type ModeCtx = {
  state: ModeState;
  setDataMode: (m: DataMode) => void;
  setTradingMode: (m: TradingMode) => void;
  setDataSource: (m: DataSourceType) => void;
};

const Ctx = createContext<ModeCtx | null>(null);
const KEY = 'app.mode.state.v1';

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModeState>(() => {
    const saved = readJSON<Partial<ModeState>>(KEY, {});
    return {
      dataMode: parseDataMode(saved.dataMode as any),
      tradingMode: parseTradingMode(saved.tradingMode as any),
      dataSource: parseDataSource(saved.dataSource as any),
    };
  });

  useEffect(() => {
    writeJSON(KEY, state);
  }, [state]);

  const setDataMode = useCallback(
    (m: DataMode) => setState((s) => ({ ...s, dataMode: m })),
    []
  );
  const setTradingMode = useCallback(
    (m: TradingMode) => setState((s) => ({ ...s, tradingMode: m })),
    []
  );
  const setDataSource = useCallback(
    (m: DataSourceType) => setState((s) => ({ ...s, dataSource: m })),
    []
  );

  const value = useMemo(
    () => ({ state, setDataMode, setTradingMode, setDataSource }),
    [state, setDataMode, setTradingMode, setDataSource]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMode() {
  const ctx = useContext(Ctx);
  if (!ctx) console.error('ModeContext not available');
  return ctx;
}
