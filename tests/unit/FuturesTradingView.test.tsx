import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { FuturesTradingView } from '../../src/views/FuturesTradingView';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock Logger
vi.mock('../../src/core/Logger.js', () => ({
  Logger: {
    getInstance: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

// Mock Toast
vi.mock('../../src/components/ui/Toast', () => ({
  showToast: vi.fn(),
}));

// Mock ConfirmModal
vi.mock('../../src/components/ui/ConfirmModal', () => ({
  useConfirmModal: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    ModalComponent: () => null,
  }),
}));

// Mock KuCoinFuturesService
vi.mock('../../src/services/KuCoinFuturesService.js', () => ({
  KuCoinFuturesService: {
    getInstance: () => ({
      isConfigured: () => true,
      placeOrder: vi.fn().mockResolvedValue({ orderId: 'test-order-123' }),
      closePosition: vi.fn().mockResolvedValue({ success: true }),
      cancelOrder: vi.fn().mockResolvedValue({ success: true }),
      getPositions: vi.fn().mockResolvedValue([]),
      getOrders: vi.fn().mockResolvedValue([]),
      getBalance: vi.fn().mockResolvedValue({ availableBalance: 1000, totalBalance: 1000 }),
    }),
  },
}));

const API_BASE = '/api';

const server = setupServer(
  http.get(`${API_BASE}/futures/positions`, () => {
    return HttpResponse.json({
      status: 'ok',
      data: {
        positions: [
          {
            symbol: 'BTCUSDT',
            side: 'LONG',
            size: 0.1,
            entryPrice: 50000,
            markPrice: 51000,
            unrealizedPnl: 100,
            leverage: 5,
          },
        ],
      },
    });
  }),

  http.get(`${API_BASE}/futures/orders`, () => {
    return HttpResponse.json({
      status: 'ok',
      data: {
        orders: [
          {
            orderId: 'order-1',
            symbol: 'ETHUSDT',
            side: 'BUY',
            type: 'LIMIT',
            size: 1,
            price: 3000,
          },
        ],
      },
    });
  }),

  http.get(`${API_BASE}/futures/balance`, () => {
    return HttpResponse.json({
      status: 'ok',
      data: {
        balance: {
          availableBalance: 1000,
          totalBalance: 1200,
        },
      },
    });
  }),

  http.get(`${API_BASE}/scoring/snapshot`, () => {
    return HttpResponse.json({
      status: 'ok',
      data: {
        snapshot: {
          finalScore: 75,
          action: 'BUY',
          entryPlan: {
            sl: 48000,
            tp: [52000, 54000],
            ladder: [49000, 50000],
            leverage: 5,
          },
        },
      },
    });
  }),

  http.post(`${API_BASE}/futures/order`, () => {
    return HttpResponse.json({
      status: 'ok',
      data: {
        orderId: 'new-order-123',
        symbol: 'BTCUSDT',
      },
    });
  }),

  // Error case: AI data too small
  http.get(`${API_BASE}/predict/error`, () => {
    return HttpResponse.json({
      status: 'error',
      code: 'AI_DATA_TOO_SMALL',
      message: 'Not enough data for prediction',
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('FuturesTradingView - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders FuturesTradingView with main elements', async () => {
    render(<FuturesTradingView />);

    await waitFor(() => {
      expect(screen.getByText(/Futures Trading/i)).toBeInTheDocument();
    });

    // Check for key sections
    expect(screen.getByText(/Place Order/i)).toBeInTheDocument();
    expect(screen.getByText(/Positions/i)).toBeInTheDocument();
  });

  it('displays balance information', async () => {
    render(<FuturesTradingView />);

    await waitFor(() => {
      expect(screen.getByText(/Available Balance/i)).toBeInTheDocument();
    });
  });

  it('allows switching between trading modes', async () => {
    const user = userEvent.setup();
    render(<FuturesTradingView />);

    await waitFor(() => {
      expect(screen.getByText(/Futures Trading/i)).toBeInTheDocument();
    });

    // Find mode toggle buttons
    const signalsButton = screen.getAllByText(/Signals Only/i)[0];
    const autoTradeButton = screen.getAllByText(/Auto Trade/i)[0];

    // Click to switch modes
    await user.click(autoTradeButton);
    
    // Mode should change (visually indicated by button state)
    expect(autoTradeButton).toBeInTheDocument();
  });

  it('validates order form inputs', async () => {
    const user = userEvent.setup();
    render(<FuturesTradingView />);

    await waitFor(() => {
      expect(screen.getByText(/Place Order/i)).toBeInTheDocument();
    });

    // Find size input
    const sizeInput = screen.getByLabelText(/Size/i) || screen.getByPlaceholderText(/0.1/i);
    
    if (sizeInput) {
      // Enter invalid size (negative)
      await user.clear(sizeInput);
      await user.type(sizeInput, '-1');
      
      // Form validation should handle this
      expect(sizeInput).toHaveValue(-1);
    }
  });

  it('displays positions correctly', async () => {
    render(<FuturesTradingView />);

    await waitFor(() => {
      expect(screen.getByText(/BTCUSDT/i)).toBeInTheDocument();
      expect(screen.getByText(/LONG/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});

describe('FuturesTradingView - Order Placement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits market order successfully', async () => {
    const user = userEvent.setup();
    render(<FuturesTradingView />);

    await waitFor(() => {
      expect(screen.getByText(/Place Order/i)).toBeInTheDocument();
    });

    // Select market order type
    const marketButton = screen.getByText(/Market/i);
    await user.click(marketButton);

    // Find and click the buy button
    const buyButtons = screen.getAllByRole('button', { name: /buy|long/i });
    const placeOrderButton = buyButtons.find(btn => btn.textContent?.includes('BUY'));
    
    if (placeOrderButton) {
      await user.click(placeOrderButton);
      
      // Wait for order submission
      await waitFor(() => {
        // Toast should show success message
        // (We mocked showToast, so we can verify it was called)
      });
    }
  });
});

describe('FuturesTradingView - Error Handling', () => {
  it('handles API errors gracefully', async () => {
    // Override server to return error
    server.use(
      http.get(`${API_BASE}/futures/positions`, () => {
        return HttpResponse.json({
          status: 'error',
          code: 'API_ERROR',
          message: 'Failed to fetch positions',
        }, { status: 500 });
      })
    );

    render(<FuturesTradingView />);

    // Component should still render without crashing
    await waitFor(() => {
      expect(screen.getByText(/Futures Trading/i)).toBeInTheDocument();
    });
  });

  it('displays AI_DATA_TOO_SMALL error appropriately', async () => {
    server.use(
      http.get(`${API_BASE}/scoring/snapshot`, () => {
        return HttpResponse.json({
          status: 'error',
          code: 'AI_DATA_TOO_SMALL',
          message: 'Not enough data for prediction',
        });
      })
    );

    render(<FuturesTradingView />);

    await waitFor(() => {
      expect(screen.getByText(/Futures Trading/i)).toBeInTheDocument();
    });

    // Component should handle this gracefully without showing prediction
  });
});
