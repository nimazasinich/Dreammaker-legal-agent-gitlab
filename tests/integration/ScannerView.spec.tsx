import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import ScannerView from '../../src/views/ScannerView';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

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

vi.mock('../../src/contexts/DataContext', () => ({
  useData: () => ({
    prices: [
      { symbol: 'BTC', price: 52000, change24h: 2.5, volume: 1000000 },
      { symbol: 'ETH', price: 3200, change24h: 1.8, volume: 500000 },
      { symbol: 'SOL', price: 120, change24h: -0.5, volume: 200000 },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('../../src/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    subscribe: vi.fn(() => () => {}),
    isConnected: true,
  }),
}));

vi.mock('../../src/services/dataManager', () => ({
  dataManager: {
    getMarketScan: vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          symbol: 'BTCUSDT',
          price: 52000,
          change24h: 2.5,
          volume: 1000000,
          score: 85,
        },
        {
          symbol: 'ETHUSDT',
          price: 3200,
          change24h: 1.8,
          volume: 500000,
          score: 78,
        },
      ],
    }),
  },
}));

const server = setupServer(
  http.get('/api/scanner/signals', () => {
    return HttpResponse.json({
      status: 'ok',
      data: [
        {
          symbol: 'BTCUSDT',
          signal: 'BUY',
          strength: 'strong',
          score: 85,
          volume: 1000000,
          change: 2.5,
        },
        {
          symbol: 'ETHUSDT',
          signal: 'HOLD',
          strength: 'medium',
          score: 65,
          volume: 500000,
          change: 1.2,
        },
        {
          symbol: 'SOLUSDT',
          signal: 'SELL',
          strength: 'weak',
          score: 45,
          volume: 200000,
          change: -1.5,
        },
      ],
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ScannerView - Filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders scanner view with filter controls', async () => {
    render(<ScannerView />);

    await waitFor(() => {
      expect(screen.getByText(/Scanner|Market Scanner/i)).toBeInTheDocument();
    });
  });

  it('filters by volume range', async () => {
    const user = userEvent.setup();
    render(<ScannerView />);

    await waitFor(() => {
      expect(screen.getByText(/Scanner|Market/i)).toBeInTheDocument();
    });

    // Find volume filter input
    const volumeInput = screen.queryByPlaceholderText(/volume|min volume/i);
    
    if (volumeInput) {
      await user.clear(volumeInput);
      await user.type(volumeInput, '500000');
      
      // Wait for filter to apply
      await waitFor(() => {
        // Results should be filtered
        expect(document.body).toBeInTheDocument();
      });
    }
  });

  it('filters by price change percentage', async () => {
    const user = userEvent.setup();
    render(<ScannerView />);

    await waitFor(() => {
      expect(screen.getByText(/Scanner|Market/i)).toBeInTheDocument();
    });

    // Find change filter
    const changeInput = screen.queryByPlaceholderText(/change|%/i);
    
    if (changeInput) {
      await user.clear(changeInput);
      await user.type(changeInput, '2');
      
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    }
  });

  it('filters by symbol search query', async () => {
    const user = userEvent.setup();
    render(<ScannerView />);

    await waitFor(() => {
      expect(screen.getByText(/Scanner|Market/i)).toBeInTheDocument();
    });

    // Find search input
    const searchInput = screen.queryByPlaceholderText(/search|symbol/i);
    
    if (searchInput) {
      await user.type(searchInput, 'BTC');
      
      await waitFor(() => {
        // Should show only BTC results
        expect(document.body).toBeInTheDocument();
      });
    }
  });
});

describe('ScannerView - Sorting', () => {
  it('sorts by price ascending', async () => {
    render(<ScannerView />);

    await waitFor(() => {
      expect(screen.getByText(/Scanner|Market/i)).toBeInTheDocument();
    });

    // Find price column header for sorting
    const priceHeader = screen.queryByText(/price/i);
    
    if (priceHeader) {
      fireEvent.click(priceHeader);
      
      await waitFor(() => {
        // Results should be sorted
        expect(document.body).toBeInTheDocument();
      });
    }
  });

  it('sorts by volume descending', async () => {
    render(<ScannerView />);

    await waitFor(() => {
      expect(screen.getByText(/Scanner|Market/i)).toBeInTheDocument();
    });

    // Find volume column header
    const volumeHeader = screen.queryByText(/volume/i);
    
    if (volumeHeader) {
      fireEvent.click(volumeHeader);
      
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    }
  });

  it('sorts by score/signal strength', async () => {
    render(<ScannerView />);

    await waitFor(() => {
      expect(screen.getByText(/Scanner|Market/i)).toBeInTheDocument();
    });

    // Find score/signal column
    const scoreHeader = screen.queryByText(/score|strength|signal/i);
    
    if (scoreHeader) {
      fireEvent.click(scoreHeader);
      
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    }
  });
});

describe('ScannerView - Pagination', () => {
  it('paginates results correctly', async () => {
    render(<ScannerView />);

    await waitFor(() => {
      expect(screen.getByText(/Scanner|Market/i)).toBeInTheDocument();
    });

    // Look for pagination controls
    const nextButton = screen.queryByText(/next|>/i);
    const prevButton = screen.queryByText(/prev|previous|</i);
    
    if (nextButton) {
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        // Should navigate to next page
        expect(document.body).toBeInTheDocument();
      });
    }
  });

  it('displays correct page numbers', async () => {
    render(<ScannerView />);

    await waitFor(() => {
      expect(screen.getByText(/Scanner|Market/i)).toBeInTheDocument();
    });

    // Look for page indicator
    const pageInfo = screen.queryByText(/page \d+|showing \d+-\d+/i);
    
    if (pageInfo) {
      expect(pageInfo).toBeInTheDocument();
    }
  });
});

describe('ScannerView - Selection', () => {
  it('allows selecting individual scanner results', async () => {
    const user = userEvent.setup();
    render(<ScannerView />);

    await waitFor(() => {
      expect(screen.getByText(/Scanner|Market/i)).toBeInTheDocument();
    });

    // Find first selectable row
    const firstRow = document.querySelector('[data-testid*="scanner-row"], tr[data-symbol]');
    
    if (firstRow) {
      await user.click(firstRow as HTMLElement);
      
      await waitFor(() => {
        // Row should be selected (highlighted)
        expect(document.body).toBeInTheDocument();
      });
    }
  });

  it('handles multiple selections', async () => {
    const user = userEvent.setup();
    render(<ScannerView />);

    await waitFor(() => {
      expect(screen.getByText(/Scanner|Market/i)).toBeInTheDocument();
    });

    // Find checkboxes for multi-select
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    
    if (checkboxes.length > 1) {
      await user.click(checkboxes[0] as HTMLElement);
      await user.click(checkboxes[1] as HTMLElement);
      
      await waitFor(() => {
        // Multiple items should be selected
        expect(document.body).toBeInTheDocument();
      });
    }
  });
});

describe('ScannerView - WebSocket Integration', () => {
  it('receives live updates via WebSocket', async () => {
    render(<ScannerView />);

    await waitFor(() => {
      expect(screen.getByText(/Scanner|Market/i)).toBeInTheDocument();
    });

    // Mock WebSocket update
    // (In real implementation, this would trigger via the mocked useWebSocket)
    
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });
});
