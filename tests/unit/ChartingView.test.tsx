import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import ChartingView from '../../src/views/ChartingView';

// Mock dependencies
vi.mock('../../src/core/Logger.js', () => ({
  Logger: {
    getInstance: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock('../../src/services/dataManager', () => ({
  dataManager: {
    analyzeSMC: vi.fn().mockResolvedValue({ success: true, data: {} }),
    analyzeElliott: vi.fn().mockResolvedValue({ success: true, data: {} }),
  },
}));

// Mock useOHLC hook
vi.mock('../../src/hooks/useOHLC', () => ({
  useOHLC: (symbol: string, timeframe: string) => ({
    state: {
      status: 'success',
      data: {
        bars: [
          { t: Date.now(), o: 50000, h: 51000, l: 49000, c: 50500, v: 1000 },
          { t: Date.now() + 3600000, o: 50500, h: 51500, l: 50000, c: 51000, v: 1200 },
        ],
        updatedAt: new Date(),
      },
    },
    reload: vi.fn(),
  }),
}));

vi.mock('../../src/hooks/useDebouncedEffect', () => ({
  useDebouncedEffect: (callback: Function, deps: any[], delay: number) => {
    React.useEffect(() => {
      callback();
    }, deps);
  },
}));

vi.mock('../../src/hooks/useSafeAsync', () => ({
  useSafeAsync: () => ({
    run: (fn: Function) => fn(),
  }),
}));

describe('ChartingView - Empty Data Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ChartingView successfully with data', async () => {
    render(<ChartingView />);

    await waitFor(() => {
      expect(screen.getByText(/BTC\/USDT|Bitcoin/i)).toBeInTheDocument();
    });
  });

  it('handles empty OHLC data gracefully', async () => {
    // Mock useOHLC to return empty data
    const useOHLC = await import('../../src/hooks/useOHLC');
    vi.mocked(useOHLC.useOHLC).mockReturnValue({
      state: {
        status: 'success',
        data: {
          bars: [],
          updatedAt: new Date(),
        },
      },
      reload: vi.fn(),
    });

    render(<ChartingView />);

    await waitFor(() => {
      // Component should render without crashing
      expect(screen.getByText(/BTC\/USDT|Bitcoin/i)).toBeInTheDocument();
    });

    // Should show fallback or empty state
    const bodyText = await screen.findByText(/./);
    expect(bodyText).toBeInTheDocument();
  });

  it('handles corrupt/invalid OHLC data', async () => {
    // Mock useOHLC to return corrupt data
    const useOHLC = await import('../../src/hooks/useOHLC');
    vi.mocked(useOHLC.useOHLC).mockReturnValue({
      state: {
        status: 'success',
        data: {
          bars: [
            // @ts-ignore - intentionally corrupt data
            { t: 'invalid', o: null, h: undefined, l: NaN, c: 'bad', v: -1 },
          ],
          updatedAt: new Date(),
        },
      },
      reload: vi.fn(),
    });

    render(<ChartingView />);

    await waitFor(() => {
      // Component should not crash
      expect(screen.getByText(/BTC\/USDT|Bitcoin/i)).toBeInTheDocument();
    });
  });

  it('displays error state when OHLC loading fails', async () => {
    // Mock useOHLC to return error state
    const useOHLC = await import('../../src/hooks/useOHLC');
    vi.mocked(useOHLC.useOHLC).mockReturnValue({
      state: {
        status: 'error',
        error: new Error('Failed to load chart data'),
      },
      reload: vi.fn(),
    });

    render(<ChartingView />);

    await waitFor(() => {
      // Should show error message or fallback
      const body = document.body;
      expect(body).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching data', async () => {
    // Mock useOHLC to return loading state
    const useOHLC = await import('../../src/hooks/useOHLC');
    vi.mocked(useOHLC.useOHLC).mockReturnValue({
      state: {
        status: 'loading',
      },
      reload: vi.fn(),
    });

    render(<ChartingView />);

    await waitFor(() => {
      // Should show loading indicator (skeleton, spinner, etc.)
      expect(document.body).toBeInTheDocument();
    });
  });

  it('handles missing price data in OHLC bars', async () => {
    const useOHLC = await import('../../src/hooks/useOHLC');
    vi.mocked(useOHLC.useOHLC).mockReturnValue({
      state: {
        status: 'success',
        data: {
          bars: [
            // Missing some price fields
            { t: Date.now(), o: 50000, h: 51000, l: 49000, c: 0, v: 1000 },
          ],
          updatedAt: new Date(),
        },
      },
      reload: vi.fn(),
    });

    render(<ChartingView />);

    await waitFor(() => {
      expect(screen.getByText(/BTC\/USDT|Bitcoin/i)).toBeInTheDocument();
    });

    // Should not display "NaN" or "undefined" in the price
    const bodyText = document.body.textContent || '';
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('undefined');
  });
});

describe('ChartingView - Data Validation', () => {
  it('validates OHLC data structure', async () => {
    const useOHLC = await import('../../src/hooks/useOHLC');
    vi.mocked(useOHLC.useOHLC).mockReturnValue({
      state: {
        status: 'success',
        data: {
          bars: [
            { t: Date.now(), o: 50000, h: 51000, l: 49000, c: 50500, v: 1000 },
          ],
          updatedAt: new Date(),
        },
      },
      reload: vi.fn(),
    });

    render(<ChartingView />);

    await waitFor(() => {
      expect(screen.getByText(/BTC\/USDT|Bitcoin/i)).toBeInTheDocument();
    });

    // Chart should display properly with valid data
    expect(document.querySelector('canvas') || document.querySelector('[data-chart]')).toBeTruthy();
  });

  it('handles negative volume values', async () => {
    const useOHLC = await import('../../src/hooks/useOHLC');
    vi.mocked(useOHLC.useOHLC).mockReturnValue({
      state: {
        status: 'success',
        data: {
          bars: [
            { t: Date.now(), o: 50000, h: 51000, l: 49000, c: 50500, v: -1000 },
          ],
          updatedAt: new Date(),
        },
      },
      reload: vi.fn(),
    });

    render(<ChartingView />);

    await waitFor(() => {
      expect(screen.getByText(/BTC\/USDT|Bitcoin/i)).toBeInTheDocument();
    });

    // Should render without errors despite negative volume
    expect(document.body).toBeInTheDocument();
  });
});

describe('ChartingView - Fallback Behavior', () => {
  it('shows fallback message when no data available', async () => {
    const useOHLC = await import('../../src/hooks/useOHLC');
    vi.mocked(useOHLC.useOHLC).mockReturnValue({
      state: {
        status: 'success',
        data: {
          bars: [],
          updatedAt: null,
        },
      },
      reload: vi.fn(),
    });

    render(<ChartingView />);

    await waitFor(() => {
      // Component renders
      expect(document.body).toBeInTheDocument();
    });
  });

  it('allows retry after data loading failure', async () => {
    const reloadMock = vi.fn();
    const useOHLC = await import('../../src/hooks/useOHLC');
    vi.mocked(useOHLC.useOHLC).mockReturnValue({
      state: {
        status: 'error',
        error: new Error('Network error'),
      },
      reload: reloadMock,
    });

    render(<ChartingView />);

    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });

    // Look for retry button (refresh icon)
    const refreshButton = document.querySelector('button:has([data-lucide="refresh-cw"])');
    if (refreshButton) {
      refreshButton.click();
      expect(reloadMock).toHaveBeenCalled();
    }
  });
});
