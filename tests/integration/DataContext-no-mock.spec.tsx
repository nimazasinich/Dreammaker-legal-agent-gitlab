/**
 * DataContext Integration Test - No Mock Data
 * 
 * Validates that DataContext never returns mock/fabricated data to the UI.
 * Ensures proper fallback states are returned when real data is unavailable.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DataProvider, useData } from '../../src/contexts/DataContext';
import React from 'react';

// Mock DatasourceClient
vi.mock('../../src/services/DatasourceClient', () => ({
  default: {
    getTopCoins: vi.fn(),
    getPriceChart: vi.fn(),
    getAIPrediction: vi.fn(),
  },
}));

// Mock BootstrapOrchestrator
vi.mock('../../src/services/BootstrapOrchestrator', () => ({
  BootstrapOrchestrator: {
    bootstrap: vi.fn((fn) => fn()),
  },
}));

// Test component that uses DataContext
function TestConsumer() {
  const {
    portfolio,
    positions,
    prices,
    signals,
    loading,
    error,
    dataSource,
  } = useData();

  return (
    <div>
      <div data-testid="loading">{loading ? 'true' : 'false'}</div>
      <div data-testid="error">{error || 'none'}</div>
      <div data-testid="data-source">{dataSource}</div>
      <div data-testid="portfolio">
        {portfolio ? JSON.stringify(portfolio) : 'null'}
      </div>
      <div data-testid="positions-count">{positions?.length || 0}</div>
      <div data-testid="prices-count">{prices?.length || 0}</div>
      <div data-testid="signals-count">{signals?.length || 0}</div>
    </div>
  );
}

describe('DataContext - No Mock Data Policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Disable initial load for controlled testing
    vi.stubEnv('VITE_DISABLE_INITIAL_LOAD', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null portfolio when no real data available (not mock data)', async () => {
    const DatasourceClient = (await import('../../src/services/DatasourceClient')).default;
    
    // Mock empty responses
    vi.mocked(DatasourceClient.getTopCoins).mockResolvedValue([]);
    vi.mocked(DatasourceClient.getAIPrediction).mockResolvedValue(null);
    
    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Portfolio should be null, not mock data
    const portfolioText = screen.getByTestId('portfolio').textContent;
    expect(portfolioText).toBe('null');
    
    // Ensure it's not the old mock data
    expect(portfolioText).not.toContain('10000'); // Old mock totalValue
    expect(portfolioText).not.toContain('520'); // Old mock dayPnL
  });

  it('returns empty arrays for positions (not mock positions)', async () => {
    const DatasourceClient = (await import('../../src/services/DatasourceClient')).default;
    
    vi.mocked(DatasourceClient.getTopCoins).mockResolvedValue([]);
    vi.mocked(DatasourceClient.getAIPrediction).mockResolvedValue(null);
    
    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Positions should be empty array (no positions), not mock data
    expect(screen.getByTestId('positions-count').textContent).toBe('0');
  });

  it('shows real prices when available', async () => {
    const DatasourceClient = (await import('../../src/services/DatasourceClient')).default;
    
    const mockPrices = [
      { symbol: 'BTC', price: 50000, change24h: 2.5 },
      { symbol: 'ETH', price: 3000, change24h: -1.2 },
    ];
    
    vi.mocked(DatasourceClient.getTopCoins).mockResolvedValue(mockPrices as any);
    vi.mocked(DatasourceClient.getAIPrediction).mockResolvedValue(null);
    
    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('prices-count').textContent).toBe('2');
    });

    // Data source should be 'real'
    expect(screen.getByTestId('data-source').textContent).toBe('real');
  });

  it('handles API errors gracefully with error messages (no mock fallback)', async () => {
    const DatasourceClient = (await import('../../src/services/DatasourceClient')).default;
    
    vi.mocked(DatasourceClient.getTopCoins).mockRejectedValue(
      new Error('Network error')
    );
    
    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      const errorText = screen.getByTestId('error').textContent;
      expect(errorText).not.toBe('none');
      expect(errorText).toContain('خطا'); // Persian error message
    });

    // Even with error, should not show mock data
    const portfolioText = screen.getByTestId('portfolio').textContent;
    expect(portfolioText).toBe('null');
  });

  it('never shows hardcoded business values in portfolio', async () => {
    const DatasourceClient = (await import('../../src/services/DatasourceClient')).default;
    
    vi.mocked(DatasourceClient.getTopCoins).mockResolvedValue([]);
    vi.mocked(DatasourceClient.getAIPrediction).mockResolvedValue(null);
    
    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    const portfolioText = screen.getByTestId('portfolio').textContent;
    
    // Forbidden mock values from old implementation
    const forbiddenValues = ['10000', '520', '5.2', 'totalValue', 'dayPnL'];
    
    for (const forbidden of forbiddenValues) {
      expect(portfolioText?.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it('data source is never "unknown" when real data loads', async () => {
    const DatasourceClient = (await import('../../src/services/DatasourceClient')).default;
    
    const mockPrices = [{ symbol: 'BTC', price: 50000 }];
    vi.mocked(DatasourceClient.getTopCoins).mockResolvedValue(mockPrices as any);
    vi.mocked(DatasourceClient.getAIPrediction).mockResolvedValue(null);
    
    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      const dataSource = screen.getByTestId('data-source').textContent;
      expect(dataSource).not.toBe('unknown');
      expect(['real', 'mock']).toContain(dataSource);
    });
  });
});
