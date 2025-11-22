import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import TradingView from '../../src/views/TradingView';
import { ModeProvider } from '../../src/contexts/ModeContext';
import { TradingProvider } from '../../src/contexts/TradingContext';

// Mock contexts
vi.mock('../../src/contexts/ModeContext', () => ({
  ModeProvider: ({ children }: any) => <div>{children}</div>,
  useMode: () => ({
    state: { dataMode: 'online' },
    setDataMode: vi.fn(),
  }),
}));

vi.mock('../../src/contexts/TradingContext', () => ({
  TradingProvider: ({ children }: any) => <div>{children}</div>,
  useTrading: () => ({
    tradingMode: 'virtual',
    setMode: vi.fn(),
    balance: 10000,
    positions: [],
    orders: [],
    placeOrder: vi.fn(),
    closePosition: vi.fn(),
    cancelOrder: vi.fn(),
    refreshData: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('../../src/components/ui/ConfirmModal', () => ({
  useConfirmModal: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    ModalComponent: () => null,
  }),
}));

describe('TradingView - DISABLED_BY_CONFIG guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders disabled state with warning banner when disabled prop is true', () => {
    render(<TradingView disabled={true} />);

    // Check for disabled warning banner
    expect(screen.getByText(/SPOT Trading Interface Disabled/i)).toBeInTheDocument();
    expect(screen.getByText(/not implemented/i)).toBeInTheDocument();
    expect(screen.getByText(/Leverage/i)).toBeInTheDocument();
  });

  it('renders normal state when disabled prop is false', () => {
    render(<TradingView disabled={false} />);

    // Should not show disabled banner
    expect(screen.queryByText(/SPOT Trading Interface Disabled/i)).not.toBeInTheDocument();
    
    // Should show normal trading interface
    expect(screen.getByText(/Advanced Trading/i)).toBeInTheDocument();
    expect(screen.getByText(/Place Order/i)).toBeInTheDocument();
  });

  it('renders normal state by default (when disabled prop is omitted)', () => {
    render(<TradingView />);

    // Should not show disabled banner by default
    expect(screen.queryByText(/SPOT Trading Interface Disabled/i)).not.toBeInTheDocument();
    
    // Should show normal trading interface
    expect(screen.getByText(/Advanced Trading/i)).toBeInTheDocument();
  });

  it('applies disabled styling when disabled=true', () => {
    const { container } = render(<TradingView disabled={true} />);
    
    // Find the main container
    const mainDiv = container.querySelector('.min-h-screen');
    expect(mainDiv).toHaveStyle({ opacity: '0.6', pointerEvents: 'none' });
  });

  it('does not apply disabled styling when disabled=false', () => {
    const { container } = render(<TradingView disabled={false} />);
    
    const mainDiv = container.querySelector('.min-h-screen');
    expect(mainDiv).not.toHaveStyle({ opacity: '0.6' });
  });
});
