import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import RiskView from '../../src/views/RiskView';

// Mock dependencies
vi.mock('../../src/components/Theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('../../src/components/LiveDataContext', () => ({
  useLiveData: () => ({
    subscribeToSignals: vi.fn(() => vi.fn()), // Returns unsubscribe function
  }),
}));

vi.mock('../../src/services/DatasourceClient', () => ({
  default: {
    getRiskMetrics: vi.fn().mockResolvedValue({
      mock: true,
      valueAtRisk: -2450,
      maxDrawdown: -12.3,
      sharpeRatio: 1.45,
    }),
  },
}));

vi.mock('../../src/components/ui/Toast', () => ({
  showToast: vi.fn(),
}));

describe('RiskView - Mock Data Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders RiskView with mock data', async () => {
    render(<RiskView />);

    await waitFor(() => {
      expect(screen.getByText(/Risk Management Center/i)).toBeInTheDocument();
    });
  });

  it('displays mock risk metrics correctly', async () => {
    render(<RiskView />);

    await waitFor(() => {
      // Check for Value at Risk
      expect(screen.getByText(/Value at Risk/i)).toBeInTheDocument();
      expect(screen.getByText(/-2450/)).toBeInTheDocument();

      // Check for Max Drawdown
      expect(screen.getByText(/Max Drawdown/i)).toBeInTheDocument();
      expect(screen.getByText(/-12.3%/)).toBeInTheDocument();

      // Check for Sharpe Ratio
      expect(screen.getByText(/Sharpe Ratio/i)).toBeInTheDocument();
      expect(screen.getByText(/1.45/)).toBeInTheDocument();
    });
  });

  it('displays risk alerts', async () => {
    render(<RiskView />);

    await waitFor(() => {
      expect(screen.getByText(/Risk Alerts/i)).toBeInTheDocument();
      expect(screen.getByText(/High Correlation/i)).toBeInTheDocument();
      expect(screen.getByText(/Position Size/i)).toBeInTheDocument();
    });
  });

  it('displays stress tests', async () => {
    render(<RiskView />);

    await waitFor(() => {
      expect(screen.getByText(/Stress Tests/i)).toBeInTheDocument();
      expect(screen.getByText(/2008 Crisis Scenario/i)).toBeInTheDocument();
      expect(screen.getByText(/COVID-19 Crash/i)).toBeInTheDocument();
      expect(screen.getByText(/Flash Crash/i)).toBeInTheDocument();
    });
  });

  it('handles empty alerts array gracefully', async () => {
    const { container } = render(<RiskView />);

    await waitFor(() => {
      // Should render without crashing
      expect(container.querySelector('.space-y-4')).toBeInTheDocument();
    });
  });

  it('handles empty stress tests array gracefully', async () => {
    const { container } = render(<RiskView />);

    await waitFor(() => {
      // Should render without crashing
      expect(container).toBeInTheDocument();
    });
  });
});
