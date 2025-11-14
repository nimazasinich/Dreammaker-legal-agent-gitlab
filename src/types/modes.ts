export type DataMode = 'offline' | 'online';
export type TradingMode = 'virtual' | 'real';
export type DataSourceType = 'huggingface' | 'exchanges' | 'mixed';

export interface ModeState {
  dataMode: DataMode;
  tradingMode: TradingMode;
  dataSource?: DataSourceType;
}

export const DEFAULT_MODE: ModeState = {
  dataMode: 'online',  // Changed to 'online' to use real API data by default
  tradingMode: 'virtual',
  dataSource: 'huggingface',  // Default to HuggingFace as primary data source
};

export function parseDataMode(v: string | null | undefined): DataMode {
  return v === 'online' ? 'online' : 'offline';
}

export function parseTradingMode(v: string | null | undefined): TradingMode {
  return v === 'real' ? 'real' : 'virtual';
}

export function parseDataSource(v: string | null | undefined): DataSourceType {
  if (v === 'exchanges' || v === 'mixed') return v;
  return 'huggingface';  // Default to HuggingFace
}
