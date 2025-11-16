import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { readJSON, writeJSON } from '../lib/storage';

export type RefreshIntervalOption = 30 | 60 | 120;

export interface RefreshSettings {
  autoRefreshEnabled: boolean;
  intervalSeconds: RefreshIntervalOption;
}

export interface RefreshSettingsContextValue extends RefreshSettings {
  setAutoRefreshEnabled: (enabled: boolean) => void;
  setIntervalSeconds: (seconds: RefreshIntervalOption) => void;
}

const RefreshSettingsContext = createContext<RefreshSettingsContextValue | null>(null);

const STORAGE_KEY = 'refresh-settings';

const DEFAULT_SETTINGS: RefreshSettings = {
  autoRefreshEnabled: false,
  intervalSeconds: 60,
};

function loadSettingsFromStorage(): RefreshSettings {
  try {
    const stored = readJSON<RefreshSettings>(STORAGE_KEY, DEFAULT_SETTINGS);
    if (
      typeof stored.autoRefreshEnabled === 'boolean' &&
      (stored.intervalSeconds === 30 || stored.intervalSeconds === 60 || stored.intervalSeconds === 120)
    ) {
      return stored;
    }
  } catch (error) {
    console.error('Failed to load refresh settings:', error);
  }
  return DEFAULT_SETTINGS;
}

export function RefreshSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<RefreshSettings>(loadSettingsFromStorage);

  useEffect(() => {
    writeJSON(STORAGE_KEY, settings);
  }, [settings]);

  const setAutoRefreshEnabled = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, autoRefreshEnabled: enabled }));
  };

  const setIntervalSeconds = (seconds: RefreshIntervalOption) => {
    setSettings((prev) => ({ ...prev, intervalSeconds: seconds }));
  };

  const value: RefreshSettingsContextValue = {
    autoRefreshEnabled: settings.autoRefreshEnabled,
    intervalSeconds: settings.intervalSeconds,
    setAutoRefreshEnabled,
    setIntervalSeconds,
  };

  return <RefreshSettingsContext.Provider value={value}>{children}</RefreshSettingsContext.Provider>;
}

export function useRefreshSettings(): RefreshSettingsContextValue {
  const context = useContext(RefreshSettingsContext);
  if (!context) {
    throw new Error('useRefreshSettings must be used within RefreshSettingsProvider');
  }
  return context;
}
