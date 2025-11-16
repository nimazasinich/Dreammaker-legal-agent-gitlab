import { useState, useEffect } from 'react';

export interface AutoRefreshSettings {
  enabled: boolean;
  intervalSeconds: number;
}

const DEFAULT_SETTINGS: AutoRefreshSettings = {
  enabled: false, // Disabled by default to reduce unnecessary queries
  intervalSeconds: 30 // 30 seconds default interval
};

const STORAGE_KEY = 'auto-refresh-settings';

/**
 * Hook for managing auto-refresh settings
 * Settings are persisted to localStorage
 */
export function useAutoRefreshSettings() {
  const [settings, setSettings] = useState<AutoRefreshSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load auto-refresh settings:', error);
    }
    return DEFAULT_SETTINGS;
  });

  // Persist to localStorage whenever settings change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save auto-refresh settings:', error);
    }
  }, [settings]);

  const updateSettings = (partial: Partial<AutoRefreshSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  return {
    settings,
    updateSettings
  };
}

/**
 * Get current auto-refresh settings from localStorage (non-reactive)
 */
export function getAutoRefreshSettings(): AutoRefreshSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load auto-refresh settings:', error);
  }
  return DEFAULT_SETTINGS;
}
