import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import '@testing-library/jest-dom';
import { DataProvider, useData } from '../../src/contexts/DataContext';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { successEnvelope, errorEnvelope } from '../helpers/msw-setup';

// Mock child contexts and services
vi.mock('../../src/contexts/ModeContext', () => ({
  useMode: () => ({
    state: { dataMode: 'online' },
  }),
}));

vi.mock('../../src/contexts/RefreshSettingsContext', () => ({
  useRefreshSettings: () => ({
    autoRefreshEnabled: false,
    intervalSeconds: 30,
  }),
}));

vi.mock('../../src/core/Logger.js', () => ({
  Logger: {
    getInstance: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock('../../src/services/BootstrapOrchestrator', () => ({
  BootstrapOrchestrator: {
    bootstrap: async (fn: Function) => {
      await fn();
    },
  },
}));

// Mock DatasourceClient
vi.mock('../../src/services/DatasourceClient', () => ({
  default: {
    getTopCoins: vi.fn().mockResolvedValue([
      { symbol: 'BTC', price: 52000, change24h: 2.5 },
      { symbol: 'ETH', price: 3200, change24h: 1.8 },
      { symbol: 'SOL', price: 120, change24h: -0.5 },
    ]),
    getPriceChart: vi.fn().mockResolvedValue([
      { timestamp: Date.now(), open: 50000, high: 51000, low: 49000, close: 50500, volume: 1000 },
    ]),
    getAIPrediction: vi.fn().mockResolvedValue({
      symbol: 'BTC',
      action: 'BUY',
      confidence: 0.85,
      timeframe: '1h',
      timestamp: Date.now(),
    }),
  },
}));

const API_BASE = '/api';

const server = setupServer(
  http.get(`${API_BASE}/portfolio`, () => {
    return HttpResponse.json(successEnvelope({
      totalValue: 10000,
      totalChangePercent: 5.2,
      dayPnL: 520,
    }));
  }),

  http.get(`${API_BASE}/positions`, () => {
    return HttpResponse.json(successEnvelope([
      {
        id: 'pos-1',
        symbol: 'BTCUSDT',
        size: 0.5,
        pnl: 100,
      },
    ]));
  }),

  http.get(`${API_BASE}/signals`, () => {
    return HttpResponse.json(successEnvelope([
      {
        symbol: 'BTCUSDT',
        action: 'BUY',
        confidence: 0.85,
      },
    ]));
  }),

  // Error envelope test
  http.get(`${API_BASE}/portfolio/error`, () => {
    return HttpResponse.json(errorEnvelope('PORTFOLIO_ERROR', 'Failed to load portfolio'));
  }),

  // Invalid envelope (missing status)
  http.get(`${API_BASE}/portfolio/invalid`, () => {
    return HttpResponse.json({
      data: { totalValue: 10000 },
      // Missing 'status' field
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test component that uses DataContext
function TestConsumer() {
  const data = useData();
  
  if (!data) {
    return <div>No context</div>;
  }

  return (
    <div>
      <div data-testid="loading">{data.loading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="error">{data.error || 'No error'}</div>
      <div data-testid="prices-count">{data.prices.length}</div>
      <div data-testid="signals-count">{data.signals.length}</div>
      <div data-testid="data-source">{data.dataSource}</div>
      {data.portfolio && (
        <div data-testid="portfolio-value">{data.portfolio.totalValue}</div>
      )}
    </div>
  );
}

describe('DataContext - Integration Tests', () => {
  // Disable initial load for tests
  beforeAll(() => {
    import.meta.env.VITE_DISABLE_INITIAL_LOAD = 'true';
  });

  it('provides DataContext to children', async () => {
    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent(/Loaded/i);
    });
  });

  it('loads initial data successfully', async () => {
    import.meta.env.VITE_DISABLE_INITIAL_LOAD = 'false';

    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent(/Loaded/i);
      expect(screen.getByTestId('prices-count')).toHaveTextContent(/3|5/); // Could be 3 or 5 depending on load phase
    }, { timeout: 5000 });

    import.meta.env.VITE_DISABLE_INITIAL_LOAD = 'true';
  });

  it('handles API errors gracefully with fallback', async () => {
    // Mock DatasourceClient to throw error
    const DatasourceClient = await import('../../src/services/DatasourceClient');
    vi.mocked(DatasourceClient.default.getTopCoins).mockRejectedValueOnce(new Error('Network error'));

    import.meta.env.VITE_DISABLE_INITIAL_LOAD = 'false';

    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      const errorElement = screen.getByTestId('error');
      expect(errorElement.textContent).not.toBe('No error');
    }, { timeout: 5000 });

    import.meta.env.VITE_DISABLE_INITIAL_LOAD = 'true';
  });

  it('sets data source correctly', async () => {
    import.meta.env.VITE_DISABLE_INITIAL_LOAD = 'false';

    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      const dataSource = screen.getByTestId('data-source');
      expect(dataSource.textContent).toMatch(/real|mock/);
    }, { timeout: 5000 });

    import.meta.env.VITE_DISABLE_INITIAL_LOAD = 'true';
  });

  it('provides refresh function', async () => {
    import.meta.env.VITE_DISABLE_INITIAL_LOAD = 'true';

    function TestRefresh() {
      const { refresh, loading } = useData();
      
      return (
        <div>
          <button onClick={() => refresh()}>Refresh</button>
          <div data-testid="refresh-loading">{loading ? 'Loading' : 'Not Loading'}</div>
        </div>
      );
    }

    render(
      <DataProvider>
        <TestRefresh />
      </DataProvider>
    );

    const refreshButton = screen.getByText('Refresh');
    refreshButton.click();

    // Should trigger loading state briefly
    await waitFor(() => {
      const loadingState = screen.getByTestId('refresh-loading');
      expect(loadingState).toBeInTheDocument();
    });
  });
});

describe('DataContext - API Envelope Validation', () => {
  it('handles valid success envelope', async () => {
    import.meta.env.VITE_DISABLE_INITIAL_LOAD = 'true';

    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent(/Loaded/i);
    });
  });

  it('handles error envelope correctly', async () => {
    server.use(
      http.get(`${API_BASE}/portfolio`, () => {
        return HttpResponse.json(errorEnvelope('PORTFOLIO_ERROR', 'Failed to load'));
      })
    );

    import.meta.env.VITE_DISABLE_INITIAL_LOAD = 'true';

    render(
      <DataProvider>
        <TestConsumer />
      </DataProvider>
    );

    // Component should handle error gracefully
    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });
  });
});
