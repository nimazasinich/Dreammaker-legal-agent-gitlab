/**
 * Settings API Service
 * Frontend client for settings endpoints (exchanges, telegram, agents)
 */

const API = import.meta.env.VITE_API_BASE || '/api';

// ============================================================================
// Exchanges API
// ============================================================================

export interface ExchangeCredentials {
  kucoin?: {
    apiKey?: string;
    apiSecret?: string;
    passphrase?: string;
  };
  binance?: {
    apiKey?: string;
    secret?: string;
  };
}

export const getExchanges = async () => {
  try {
    const response = await fetch(`${API}/settings/exchanges`, { mode: "cors", headers: { "Content-Type": "application/json" } });
    if (!response.ok) {
      console.error('Failed to get exchanges');
    }
    return response.json();
  } catch (error: any) {
    console.error("Error:", error);
    return { error: true, message: error.message };
  }
};

export const saveExchanges = async (payload: ExchangeCredentials) => {
  try {
    const response = await fetch(`${API}/settings/exchanges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error('Failed to save exchanges');
    }
    return response.json();
  } catch (error: any) {
    console.error("Error:", error);
    return { error: true, message: error.message };
  }
};

// ============================================================================
// Telegram API
// ============================================================================

export interface TelegramCredentials {
  botToken?: string;
  chatId?: string;
}

export const getTelegram = async () => {
  try {
    const response = await fetch(`${API}/settings/telegram`, { mode: "cors", headers: { "Content-Type": "application/json" } });
    if (!response.ok) {
      console.error('Failed to get telegram settings');
    }
    return response.json();
  } catch (error: any) {
    console.error("Error:", error);
    return { error: true, message: error.message };
  }
};

export const saveTelegram = async (payload: TelegramCredentials) => {
  try {
    const response = await fetch(`${API}/settings/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error('Failed to save telegram settings');
    }
    return response.json();
  } catch (error: any) {
    console.error("Error:", error);
    return { error: true, message: error.message };
  }
};

// ============================================================================
// Agents API (Scanner)
// ============================================================================

export interface ScannerConfig {
  enabled: boolean;
  scanIntervalMin: number;
  timeframe: string;
  assetsLimit: number;
  rankRange: [number, number];
  minVolumeUSD: number;
  useHarmonics: boolean;
}

export const getAgentScannerConfig = async () => {
  try {
    const response = await fetch(`${API}/agents/scanner/config`, { mode: "cors", headers: { "Content-Type": "application/json" } });
    if (!response.ok) {
      console.error('Failed to get scanner config');
    }
    return response.json();
  } catch (error: any) {
    console.error("Error:", error);
    return { error: true, message: error.message };
  }
};

export const saveAgentScannerConfig = async (payload: Partial<ScannerConfig>) => {
  try {
    const response = await fetch(`${API}/agents/scanner/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      console.error('Failed to save scanner config');
    }
    return response.json();
  } catch (error: any) {
    console.error("Error:", error);
    return { error: true, message: error.message };
  }
};

export const startAgentScanner = async () => {
  try {
    const response = await fetch(`${API}/agents/scanner/start`, {
      method: 'POST'
    });
    if (!response.ok) {
      console.error('Failed to start scanner agent');
    }
    return response.json();
  } catch (error: any) {
    console.error("Error:", error);
    return { error: true, message: error.message };
  }
};

export const stopAgentScanner = async () => {
  try {
    const response = await fetch(`${API}/agents/scanner/stop`, {
      method: 'POST'
    });
    if (!response.ok) {
      console.error('Failed to stop scanner agent');
    }
    return response.json();
  } catch (error: any) {
    console.error("Error:", error);
    return { error: true, message: error.message };
  }
};

export const getAgentScannerStatus = async () => {
  try {
    const response = await fetch(`${API}/agents/scanner/status`, { mode: "cors", headers: { "Content-Type": "application/json" } });
    if (!response.ok) {
      console.error('Failed to get scanner status');
    }
    return response.json();
  } catch (error: any) {
    console.error("Error:", error);
    return { error: true, message: error.message };
  }
};
