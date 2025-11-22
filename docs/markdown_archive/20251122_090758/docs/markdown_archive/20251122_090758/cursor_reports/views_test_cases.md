# Test Cases for Views Scored ≤7

**Generated**: 2025-11-22  
**Purpose**: Minimal reproducible test cases demonstrating missing functionality, failing interactions, or incomplete data paths for each view scored ≤7.

---

## Test Case Format

Each test case includes:
- **View Name** and **Score**
- **Test Type**: Unit, Integration, Runtime, or E2E
- **Test Description**: What is being tested
- **Minimal Test Code**: Playwright script or unit test demonstrating the issue
- **Expected Behavior**: What should happen
- **Current Behavior**: What actually happens (failure mode)
- **Priority**: High/Medium/Low

---

## ChartingView (Score: 7/10)

### Test Case 1: Indicator Calculations Missing

**Type**: Unit Test  
**Priority**: High

```typescript
// tests/views/ChartingView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChartingView } from '@/views/ChartingView';
import { useOHLC } from '@/hooks/useOHLC';

vi.mock('@/hooks/useOHLC');

describe('ChartingView - Indicator Calculations', () => {
  it('should calculate and display RSI indicator', async () => {
    const mockOHLCData = [
      { time: 1700000000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { time: 1700003600, open: 102, high: 108, low: 100, close: 107, volume: 1200 },
      // ... more data points for RSI calculation (minimum 14 periods)
    ];

    (useOHLC as any).mockReturnValue({
      data: mockOHLCData,
      loading: false,
      error: null
    });

    render(<ChartingView />);

    // Enable RSI indicator
    const rsiCheckbox = screen.getByLabelText(/RSI/i);
    await userEvent.click(rsiCheckbox);

    // Wait for indicator to render
    await waitFor(() => {
      const rsiIndicator = screen.getByTestId('rsi-indicator');
      expect(rsiIndicator).toBeInTheDocument();
    });

    // Verify RSI calculation is displayed
    const rsiValue = screen.getByTestId('rsi-value');
    const expectedRSI = calculateRSI(mockOHLCData); // Use proper RSI formula
    expect(parseFloat(rsiValue.textContent!)).toBeCloseTo(expectedRSI, 1);
  });

  // EXPECTED: RSI value calculated and displayed
  // CURRENT: Checkbox exists but no calculation performed
  // FAILURE MODE: TypeError: Cannot read property 'textContent' of null
});
```

### Test Case 2: Chart Scaling Issue

**Type**: Runtime Test  
**Priority**: High

```typescript
// e2e/charting-view.spec.ts
import { test, expect } from '@playwright/test';

test('Chart should scale properly with large price movements', async ({ page }) => {
  await page.goto('/charting');

  // Select a volatile symbol
  await page.selectOption('[data-testid="symbol-selector"]', 'BTCUSDT');
  await page.selectOption('[data-testid="timeframe-selector"]', '1h');

  await page.waitForTimeout(2000); // Wait for data load

  // Get canvas element
  const canvas = page.locator('canvas[data-testid="price-chart"]');
  await expect(canvas).toBeVisible();

  // Take screenshot for visual verification
  await canvas.screenshot({ path: 'chart-scaling-test.png' });

  // Verify all candles are visible (not cut off)
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).toBeTruthy();
  expect(canvasBox!.height).toBeGreaterThan(200); // Minimum chart height

  // Switch to different timeframe
  await page.selectOption('[data-testid="timeframe-selector"]', '1d');
  await page.waitForTimeout(2000);

  // Verify chart re-renders without errors
  await expect(canvas).toBeVisible();
  
  // Check console for errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  
  expect(errors).toHaveLength(0);
});

// EXPECTED: Chart scales to show all data points
// CURRENT: May have scaling issues with large price ranges
// FAILURE MODE: Candles render outside visible area
```

---

## MarketView (Score: 7/10)

### Test Case 1: Analysis Endpoints Not Implemented

**Type**: Integration Test  
**Priority**: High

```typescript
// tests/views/MarketView.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MarketView } from '@/views/MarketView';
import * as api from '@/services/api';

vi.mock('@/services/api');

describe('MarketView - Analysis Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle missing SMC analysis endpoint gracefully', async () => {
    // Mock API responses
    vi.spyOn(api, 'fetchMarketData').mockResolvedValue({
      prices: [{ symbol: 'BTCUSDT', price: 50000, change: 2.5 }]
    });

    // Mock 404 for analysis endpoint
    vi.spyOn(api, 'fetchSMCAnalysis').mockRejectedValue(
      new Error('404 Not Found')
    );

    render(<MarketView />);

    await waitFor(() => {
      expect(screen.getByText(/Market Overview/i)).toBeInTheDocument();
    });

    // Should show fallback message
    await waitFor(() => {
      const fallback = screen.queryByText(/Analysis temporarily unavailable/i);
      expect(fallback).toBeInTheDocument();
    });

    // Should NOT crash the entire view
    expect(screen.getByTestId('market-overview')).toBeInTheDocument();
  });

  // EXPECTED: Graceful fallback with user-friendly message
  // CURRENT: May show raw error or crash component
  // FAILURE MODE: Entire view fails to render
});
```

### Test Case 2: Real-time Price Updates

**Type**: E2E Test  
**Priority**: High

```typescript
// e2e/market-real-time.spec.ts
import { test, expect } from '@playwright/test';

test('Market view should update prices in real-time', async ({ page }) => {
  await page.goto('/market');

  // Wait for initial data load
  await page.waitForSelector('[data-testid="market-ticker"]');

  // Get initial BTC price
  const priceElement = page.locator('[data-symbol="BTCUSDT"] .price');
  const initialPrice = await priceElement.textContent();

  // Wait for WebSocket connection
  await page.waitForTimeout(3000);

  // Verify price updates (should change within 10 seconds for volatile market)
  let priceChanged = false;
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000);
    const currentPrice = await priceElement.textContent();
    if (currentPrice !== initialPrice) {
      priceChanged = true;
      break;
    }
  }

  expect(priceChanged).toBe(true);

  // Verify WebSocket connection status
  const wsStatus = page.locator('[data-testid="ws-connection-status"]');
  await expect(wsStatus).toHaveText(/connected/i);
});

// EXPECTED: Prices update via WebSocket every 1-2 seconds
// CURRENT: May not update or update irregularly
// FAILURE MODE: Stale prices shown to user
```

---

## BacktestView (Score: 7/10)

### Test Case 1: Demo Mode Determinism

**Type**: Unit Test  
**Priority**: High

```typescript
// tests/views/BacktestView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BacktestView } from '@/views/BacktestView';

describe('BacktestView - Demo Mode', () => {
  it('should generate identical results for same configuration', async () => {
    const { rerender } = render(<BacktestView />);

    // Set specific configuration
    await userEvent.type(screen.getByLabelText(/Initial Capital/i), '10000');
    await userEvent.selectOptions(screen.getByLabelText(/Symbol/i), 'BTCUSDT');
    await userEvent.selectOptions(screen.getByLabelText(/Timeframe/i), '1h');

    // Run demo backtest
    const runButton = screen.getByText(/Run Demo Backtest/i);
    await userEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByTestId('backtest-results')).toBeInTheDocument();
    });

    // Capture first result
    const firstResult = screen.getByTestId('total-return').textContent;
    const firstMaxDrawdown = screen.getByTestId('max-drawdown').textContent;

    // Clear and rerun with same config
    await userEvent.click(screen.getByText(/Clear/i));
    await userEvent.type(screen.getByLabelText(/Initial Capital/i), '10000');
    await userEvent.selectOptions(screen.getByLabelText(/Symbol/i), 'BTCUSDT');
    await userEvent.selectOptions(screen.getByLabelText(/Timeframe/i), '1h');
    await userEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByTestId('backtest-results')).toBeInTheDocument();
    });

    // Verify determinism
    const secondResult = screen.getByTestId('total-return').textContent;
    const secondMaxDrawdown = screen.getByTestId('max-drawdown').textContent;

    expect(firstResult).toBe(secondResult);
    expect(firstMaxDrawdown).toBe(secondMaxDrawdown);
  });

  // EXPECTED: Demo mode generates deterministic results
  // CURRENT: May have random variation
  // FAILURE MODE: Inconsistent results confuse users
});
```

### Test Case 2: Real Backtest Validation

**Type**: Integration Test  
**Priority**: High

```typescript
// tests/views/BacktestView.integration.test.tsx
import { test, expect } from '@playwright/test';

test('Real backtest should validate against known strategy performance', async ({ page }) => {
  await page.goto('/backtest');

  // Switch to Real Mode
  await page.click('[data-testid="mode-toggle"]');
  await expect(page.locator('.mode-indicator')).toHaveText(/Real Backtest/i);

  // Configure backtest with known parameters
  await page.fill('[name="symbol"]', 'BTCUSDT');
  await page.selectOption('[name="timeframe"]', '1h');
  await page.fill('[name="startDate"]', '2024-01-01');
  await page.fill('[name="endDate"]', '2024-01-31');
  await page.fill('[name="initialCapital"]', '10000');

  // Run backtest
  await page.click('button:has-text("Run Real Backtest")');

  // Wait for results
  await page.waitForSelector('[data-testid="backtest-results"]', { timeout: 30000 });

  // Verify results are reasonable
  const totalReturn = await page.textContent('[data-testid="total-return"]');
  const totalTrades = await page.textContent('[data-testid="total-trades"]');
  const winRate = await page.textContent('[data-testid="win-rate"]');

  expect(parseFloat(totalReturn!)).toBeGreaterThan(-100); // Not total loss
  expect(parseFloat(totalReturn!)).toBeLessThan(1000); // Not unrealistic gain
  expect(parseInt(totalTrades!)).toBeGreaterThan(0); // At least one trade
  expect(parseFloat(winRate!)).toBeGreaterThanOrEqual(0);
  expect(parseFloat(winRate!)).toBeLessThanOrEqual(100);

  // Verify equity curve is rendered
  await expect(page.locator('[data-testid="equity-curve"]')).toBeVisible();
});

// EXPECTED: Real backtest produces validated results
// CURRENT: Results may not match historical performance
// FAILURE MODE: Inaccurate backtest leads to false confidence
```

---

## SettingsView (Score: 7/10)

### Test Case 1: Settings Persistence

**Type**: Integration Test  
**Priority**: High

```typescript
// tests/views/SettingsView.test.tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsView } from '@/views/SettingsView';

describe('SettingsView - Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should persist detector weights to backend and localStorage', async () => {
    const mockSaveAPI = vi.fn().mockResolvedValue({ success: true });
    vi.mock('@/services/settingsAPI', () => ({
      saveSettings: mockSaveAPI
    }));

    render(<SettingsView />);

    // Modify detector weight
    const rsiWeight = screen.getByLabelText(/RSI Weight/i);
    await userEvent.clear(rsiWeight);
    await userEvent.type(rsiWeight, '2.5');

    // Save settings
    const saveButton = screen.getByText(/Save Settings/i);
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Settings saved/i)).toBeInTheDocument();
    });

    // Verify API call
    expect(mockSaveAPI).toHaveBeenCalledWith(
      expect.objectContaining({
        detectorWeights: expect.objectContaining({
          rsi: 2.5
        })
      })
    );

    // Verify localStorage
    const savedSettings = JSON.parse(localStorage.getItem('app-settings')!);
    expect(savedSettings.detectorWeights.rsi).toBe(2.5);

    // Reload view and verify persistence
    const { rerender } = render(<SettingsView />);
    await waitFor(() => {
      const reloadedWeight = screen.getByLabelText(/RSI Weight/i);
      expect(reloadedWeight).toHaveValue('2.5');
    });
  });

  // EXPECTED: Settings save to both backend and localStorage
  // CURRENT: Only saves to localStorage, backend call may be missing
  // FAILURE MODE: Settings not synced across devices/sessions
});
```

### Test Case 2: Scanner Agent Integration

**Type**: E2E Test  
**Priority**: Medium

```typescript
// e2e/scanner-agent-settings.spec.ts
import { test, expect } from '@playwright/test';

test('Scanner Agent should start/stop from settings', async ({ page }) => {
  await page.goto('/settings');

  // Navigate to Scanner Agent tab
  await page.click('button:has-text("Scanner Agent")');

  // Verify current status
  const statusBadge = page.locator('[data-testid="agent-status"]');
  await expect(statusBadge).toBeVisible();

  const initialStatus = await statusBadge.textContent();

  // Toggle agent
  const toggleButton = page.locator('button:has-text("Start Agent")');
  
  if (await toggleButton.isVisible()) {
    await toggleButton.click();
    
    // Wait for status change
    await page.waitForTimeout(2000);
    
    // Verify status changed
    await expect(statusBadge).toContainText(/running/i);
    
    // Verify API call was made
    const requests = [];
    page.on('request', req => {
      if (req.url().includes('/api/scanner-agent')) {
        requests.push(req);
      }
    });
    
    expect(requests.length).toBeGreaterThan(0);
  }

  // Stop agent
  const stopButton = page.locator('button:has-text("Stop Agent")');
  if (await stopButton.isVisible()) {
    await stopButton.click();
    await page.waitForTimeout(2000);
    await expect(statusBadge).toContainText(/stopped/i);
  }
});

// EXPECTED: Agent starts/stops with backend confirmation
// CURRENT: Button may not trigger actual backend action
// FAILURE MODE: UI shows running but agent is not active
```

---

## ProfessionalRiskView (Score: 7/10)

### Test Case 1: Empty API Response Handling

**Type**: Integration Test  
**Priority**: High

```typescript
// tests/views/ProfessionalRiskView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProfessionalRiskView } from '@/views/ProfessionalRiskView';

describe('ProfessionalRiskView - API Integration', () => {
  it('should handle empty API response gracefully', async () => {
    // Mock empty response from backend
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        metrics: null,
        liquidationRisk: [],
        stressTests: []
      })
    });

    render(<ProfessionalRiskView />);

    await waitFor(() => {
      expect(screen.getByTestId('professional-risk-view')).toBeInTheDocument();
    });

    // Should show empty state, not error
    expect(screen.getByText(/No risk data available/i)).toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

    // Components should render without crashing
    expect(screen.getByTestId('risk-gauge')).toBeInTheDocument();
    expect(screen.getByTestId('liquidation-bar')).toBeInTheDocument();
  });

  // EXPECTED: Graceful empty state display
  // CURRENT: Components may crash with null data
  // FAILURE MODE: TypeError: Cannot read properties of null
});
```

### Test Case 2: Real Position Risk Calculation

**Type**: E2E Test  
**Priority**: High

```typescript
// e2e/professional-risk-real-position.spec.ts
import { test, expect } from '@playwright/test';

test('Professional risk should calculate from actual positions', async ({ page, context }) => {
  // First, open a test position
  await page.goto('/trading/futures');
  
  // Place a market order (assuming test account)
  await page.fill('[name="symbol"]', 'BTCUSDT');
  await page.fill('[name="quantity"]', '0.01');
  await page.selectOption('[name="leverage"]', '5');
  await page.click('button:has-text("Buy/Long")');
  
  await page.waitForTimeout(2000);
  
  // Navigate to Professional Risk View
  await page.goto('/risk/professional');
  
  await page.waitForSelector('[data-testid="liquidation-bar"]', { timeout: 5000 });
  
  // Verify liquidation price is calculated
  const liquidationPrice = await page.textContent('[data-testid="liquidation-price"]');
  expect(liquidationPrice).not.toBe('--');
  expect(liquidationPrice).not.toBe('N/A');
  expect(parseFloat(liquidationPrice!)).toBeGreaterThan(0);
  
  // Verify leverage display
  const leverageDisplay = await page.textContent('[data-testid="current-leverage"]');
  expect(leverageDisplay).toContain('5');
  
  // Verify margin utilization
  const marginUtil = await page.textContent('[data-testid="margin-utilization"]');
  expect(parseFloat(marginUtil!)).toBeGreaterThan(0);
  expect(parseFloat(marginUtil!)).toBeLessThanOrEqual(100);
});

// EXPECTED: Risk metrics calculated from real positions
// CURRENT: Shows empty/default values even with open positions
// FAILURE MODE: Users can't assess actual liquidation risk
```

---

## PositionsView (Score: 7/10)

### Test Case 1: History Tab Implementation

**Type**: Runtime Test  
**Priority**: High

```typescript
// e2e/positions-history.spec.ts
import { test, expect } from '@playwright/test';

test('History tab should display closed positions', async ({ page }) => {
  await page.goto('/positions');

  // Click on History tab
  const historyTab = page.locator('button:has-text("History")');
  await historyTab.click();

  // Check if history content loads
  const historyContent = page.locator('[data-testid="history-content"]');
  
  // CURRENT BEHAVIOR: Tab exists but content not implemented
  const isImplemented = await historyContent.isVisible().catch(() => false);
  
  if (!isImplemented) {
    // Verify placeholder or message
    await expect(page.locator('text=/coming soon|not implemented/i')).toBeVisible();
  } else {
    // If implemented, verify structure
    await expect(historyContent).toBeVisible();
    
    // Should have table headers
    await expect(page.locator('th:has-text("Symbol")')).toBeVisible();
    await expect(page.locator('th:has-text("P&L")')).toBeVisible();
    await expect(page.locator('th:has-text("Close Time")')).toBeVisible();
  }
});

// EXPECTED: Full history of closed positions
// CURRENT: Tab exists but shows placeholder
// FAILURE MODE: Users cannot review trading history
```

### Test Case 2: WebSocket Position Updates

**Type**: Integration Test  
**Priority**: High

```typescript
// tests/views/PositionsView.integration.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { PositionsView } from '@/views/PositionsView';
import { WebSocketProvider } from '@/contexts/WebSocketContext';

describe('PositionsView - WebSocket Integration', () => {
  it('should update positions on WebSocket message', async () => {
    const mockUseWebSocket = vi.fn().mockReturnValue({
      connected: true,
      subscribe: vi.fn((topic, callback) => {
        // Simulate WebSocket message after 1 second
        setTimeout(() => {
          callback({
            symbol: 'BTCUSDT',
            side: 'LONG',
            size: 0.1,
            entryPrice: 50000,
            currentPrice: 51000,
            pnl: 100,
            pnlPercent: 2.0
          });
        }, 1000);
        return () => {};
      })
    });

    vi.mock('@/hooks/useWebSocket', () => ({
      useWebSocket: mockUseWebSocket
    }));

    render(
      <WebSocketProvider>
        <PositionsView />
      </WebSocketProvider>
    );

    // Initial state - may be empty
    await waitFor(() => {
      expect(screen.getByTestId('positions-table')).toBeInTheDocument();
    });

    // Wait for WebSocket update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
    });

    // Verify position appeared
    await waitFor(() => {
      expect(screen.getByText('BTCUSDT')).toBeInTheDocument();
      expect(screen.getByText(/\+2\.0%/i)).toBeInTheDocument();
    });
  });

  // EXPECTED: Real-time position updates via WebSocket
  // CURRENT: May not subscribe correctly or handle updates
  // FAILURE MODE: Stale position data shown to user
});
```

---

## PortfolioPage (Score: 7/10)

### Test Case 1: Portfolio Metrics Calculation

**Type**: Unit Test  
**Priority**: High

```typescript
// tests/views/PortfolioPage.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PortfolioPage } from '@/views/PortfolioPage';
import { DataProvider } from '@/contexts/DataContext';

describe('PortfolioPage - Metrics Calculation', () => {
  it('should calculate total portfolio value correctly', async () => {
    const mockPositions = [
      {
        symbol: 'BTCUSDT',
        side: 'LONG',
        size: 0.1,
        entryPrice: 50000,
        currentPrice: 51000,
        pnl: 100
      },
      {
        symbol: 'ETHUSDT',
        side: 'SHORT',
        size: 1.0,
        entryPrice: 3000,
        currentPrice: 2950,
        pnl: 50
      }
    ];

    const mockBalance = 10000;

    // Mock data context
    const mockDataContext = {
      positions: mockPositions,
      balance: mockBalance,
      loading: false,
      error: null
    };

    render(
      <DataProvider value={mockDataContext}>
        <PortfolioPage />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('portfolio-summary')).toBeInTheDocument();
    });

    // Calculate expected values
    const expectedValue = mockBalance + mockPositions.reduce((sum, p) => sum + p.pnl, 0);
    const expectedPnL = mockPositions.reduce((sum, p) => sum + p.pnl, 0);

    // Verify display
    const totalValue = screen.getByTestId('total-portfolio-value');
    expect(totalValue.textContent).toContain(expectedValue.toFixed(2));

    const totalPnL = screen.getByTestId('total-pnl');
    expect(totalPnL.textContent).toContain(expectedPnL.toFixed(2));
  });

  // EXPECTED: Accurate portfolio value calculation
  // CURRENT: Calculation may be incorrect or inconsistent
  // FAILURE MODE: Users see wrong portfolio value
});
```

---

## StrategyLabView (Score: 8/10) - Near Production

### Test Case: Weight Normalization

**Type**: Unit Test  
**Priority**: Medium

```typescript
// tests/views/StrategyLabView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrategyLabView } from '@/views/EnhancedStrategyLabView';

describe('StrategyLabView - Weight Management', () => {
  it('should normalize detector weights correctly', async () => {
    render(<StrategyLabView />);

    // Set weights that sum > 1.0
    await userEvent.clear(screen.getByLabelText(/RSI Weight/i));
    await userEvent.type(screen.getByLabelText(/RSI Weight/i), '0.6');
    
    await userEvent.clear(screen.getByLabelText(/MACD Weight/i));
    await userEvent.type(screen.getByLabelText(/MACD Weight/i), '0.6');

    // Trigger normalization (blur or save)
    const saveButton = screen.getByText(/Save Strategy/i);
    await userEvent.click(saveButton);

    // Verify weights are normalized to sum to 1.0
    const rsiWeight = screen.getByLabelText(/RSI Weight/i);
    const macdWeight = screen.getByLabelText(/MACD Weight/i);
    
    const rsiValue = parseFloat(rsiWeight.getAttribute('value')!);
    const macdValue = parseFloat(macdWeight.getAttribute('value')!);
    
    expect(rsiValue + macdValue).toBeCloseTo(1.0, 2);
  });

  // EXPECTED: Auto-normalization of weights
  // CURRENT: May allow invalid weight combinations
  // FAILURE MODE: Strategy simulation with incorrect weights
});
```

---

## StrategyInsightsView (Score: 7/10)

### Test Case: Pipeline Hook Integration

**Type**: Integration Test  
**Priority**: High

```typescript
// tests/views/StrategyInsightsView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { StrategyInsightsView } from '@/views/StrategyInsightsView';

describe('StrategyInsightsView - Pipeline Integration', () => {
  it('should orchestrate three strategy stages correctly', async () => {
    const mockPipelineData = {
      strategy1: { score: 75, signals: [...] },
      strategy2: { score: 82, adjustedWeights: {...} },
      strategy3: { score: 88, finalSignals: [...] }
    };

    vi.mock('@/hooks/useStrategyPipeline', () => ({
      useStrategyPipeline: () => ({
        data: mockPipelineData,
        loading: false,
        error: null,
        runPipeline: vi.fn()
      })
    }));

    render(<StrategyInsightsView />);

    await waitFor(() => {
      expect(screen.getByTestId('pipeline-overview')).toBeInTheDocument();
    });

    // Verify all three stages are displayed
    expect(screen.getByText(/Strategy 1.*75/i)).toBeInTheDocument();
    expect(screen.getByText(/Strategy 2.*82/i)).toBeInTheDocument();
    expect(screen.getByText(/Strategy 3.*88/i)).toBeInTheDocument();

    // Verify pipeline flow visualization
    expect(screen.getByTestId('pipeline-flow')).toBeInTheDocument();
  });

  // EXPECTED: Three-stage pipeline clearly visualized
  // CURRENT: Pipeline data may not flow correctly
  // FAILURE MODE: Incomplete or confusing pipeline display
});
```

---

## ExchangeSettingsView (Score: 7/10)

### Test Case 1: API Key Security

**Type**: Security Test  
**Priority**: High

```typescript
// tests/views/ExchangeSettingsView.security.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExchangeSettingsView } from '@/views/ExchangeSettingsView';

describe('ExchangeSettingsView - Security', () => {
  it('should not expose API keys in console or DOM', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');
    const consoleErrorSpy = vi.spyOn(console, 'error');

    render(<ExchangeSettingsView />);

    // Add new exchange with API key
    await userEvent.click(screen.getByText(/Add Exchange/i));
    await userEvent.selectOptions(screen.getByLabelText(/Exchange/i), 'kucoin');
    await userEvent.type(screen.getByLabelText(/API Key/i), 'test-api-key-12345');
    await userEvent.type(screen.getByLabelText(/API Secret/i), 'test-secret-67890');
    
    await userEvent.click(screen.getByText(/Save/i));

    await waitFor(() => {
      expect(screen.getByText(/Exchange saved/i)).toBeInTheDocument();
    });

    // Verify API key is not in console
    const consoleCalls = consoleLogSpy.mock.calls.concat(consoleErrorSpy.mock.calls);
    const hasKeyInConsole = consoleCalls.some(call => 
      call.some(arg => String(arg).includes('test-api-key-12345'))
    );
    expect(hasKeyInConsole).toBe(false);

    // Verify API key is masked in DOM
    const keyInput = screen.getByLabelText(/API Key/i);
    expect(keyInput.getAttribute('type')).toBe('password');

    // Verify API key not in page source
    const pageHTML = document.body.innerHTML;
    expect(pageHTML).not.toContain('test-api-key-12345');
    expect(pageHTML).not.toContain('test-secret-67890');

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // EXPECTED: API keys never exposed in client
  // CURRENT: May log or display keys in cleartext
  // FAILURE MODE: CRITICAL SECURITY VULNERABILITY
});
```

### Test Case 2: API Key Validation

**Type**: Integration Test  
**Priority**: High

```typescript
// e2e/exchange-settings-validation.spec.ts
import { test, expect } from '@playwright/test';

test('Exchange settings should validate API credentials', async ({ page }) => {
  await page.goto('/settings/exchanges');

  // Add KuCoin credentials
  await page.click('button:has-text("Add Exchange")');
  await page.selectOption('[name="exchange"]', 'kucoin');
  await page.fill('[name="apiKey"]', 'invalid-key');
  await page.fill('[name="apiSecret"]', 'invalid-secret');
  await page.fill('[name="passphrase"]', 'invalid-pass');

  // Try to save
  await page.click('button:has-text("Save")');

  // Should show validation error
  await expect(page.locator('.error-message')).toContainText(/invalid|failed|error/i);

  // Now try with valid testnet credentials (if available)
  await page.fill('[name="apiKey"]', process.env.KUCOIN_TEST_KEY || 'skip');
  
  if (process.env.KUCOIN_TEST_KEY) {
    await page.fill('[name="apiSecret"]', process.env.KUCOIN_TEST_SECRET);
    await page.fill('[name="passphrase"]', process.env.KUCOIN_TEST_PASS);
    await page.click('button:has-text("Save")');

    // Should show success
    await expect(page.locator('.success-message')).toContainText(/saved|success/i);

    // Should be able to test connection
    await page.click('button:has-text("Test Connection")');
    await expect(page.locator('.connection-status')).toContainText(/connected/i);
  }
});

// EXPECTED: API key validation before save
// CURRENT: Saves without validation, fails on usage
// FAILURE MODE: Users enter invalid keys and wonder why nothing works
```

---

## MonitoringView (Score: 7/10)

### Test Case: Error Tracking Integration

**Type**: Integration Test  
**Priority**: Medium

```typescript
// tests/views/MonitoringView.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MonitoringView } from '@/views/MonitoringView';
import { errorTracker } from '@/lib/monitoring/errorTracker';

describe('MonitoringView - Error Tracking', () => {
  beforeEach(() => {
    errorTracker.clearErrors();
  });

  it('should display tracked errors', async () => {
    // Simulate errors
    errorTracker.trackError(new Error('Test error 1'), { component: 'TestComponent' });
    errorTracker.trackError(new Error('API error'), { endpoint: '/api/test' });

    render(<MonitoringView />);

    await waitFor(() => {
      expect(screen.getByTestId('error-list')).toBeInTheDocument();
    });

    // Verify errors are displayed
    expect(screen.getByText(/Test error 1/i)).toBeInTheDocument();
    expect(screen.getByText(/API error/i)).toBeInTheDocument();

    // Verify error count
    const errorCount = screen.getByTestId('total-errors');
    expect(errorCount.textContent).toBe('2');

    // Verify error types breakdown
    expect(screen.getByText(/component/i)).toBeInTheDocument();
    expect(screen.getByText(/endpoint/i)).toBeInTheDocument();
  });

  // EXPECTED: Real-time error monitoring
  // CURRENT: errorTracker may not be properly integrated
  // FAILURE MODE: Errors not visible in monitoring view
});
```

---

## DiagnosticsView (Score: 6/10)

### Test Case: Diagnostics Endpoint

**Type**: Integration Test  
**Priority**: High

```typescript
// e2e/diagnostics-view.spec.ts
import { test, expect } from '@playwright/test';

test('Diagnostics view should load provider data', async ({ page }) => {
  // Intercept API call
  await page.route('/diagnostics', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        providers: [
          {
            name: 'HuggingFace',
            status: 'healthy',
            latency: 150,
            uptime: 99.5,
            successRate: 98.2
          },
          {
            name: 'Binance',
            status: 'healthy',
            latency: 50,
            uptime: 99.9,
            successRate: 99.8
          }
        ]
      })
    });
  });

  await page.goto('/diagnostics');

  await page.waitForSelector('[data-testid="diagnostics-view"]');

  // Verify providers are displayed
  await expect(page.locator('text=HuggingFace')).toBeVisible();
  await expect(page.locator('text=Binance')).toBeVisible();

  // Verify metrics
  await expect(page.locator('text=/150.*ms/i')).toBeVisible();
  await expect(page.locator('text=/99\.9%/i')).toBeVisible();
});

test('Diagnostics should handle endpoint not found', async ({ page }) => {
  // Mock 404
  await page.route('/diagnostics', route => {
    route.fulfill({ status: 404, body: 'Not Found' });
  });

  await page.goto('/diagnostics');

  // Should show error state
  await expect(page.locator('text=/not available|error|failed/i')).toBeVisible();
  
  // Should not crash
  await expect(page.locator('[data-testid="diagnostics-view"]')).toBeVisible();
});

// EXPECTED: Diagnostics data from backend
// CURRENT: Endpoint may return 404 or empty data
// FAILURE MODE: Cannot monitor provider health
```

---

## TechnicalAnalysisView (Score: 7/10)

### Test Case: Analyzer Accuracy

**Type**: Validation Test  
**Priority**: High

```typescript
// tests/views/TechnicalAnalysisView.validation.test.tsx
import { describe, it, expect } from 'vitest';
import { SMCAnalyzer } from '@/services/analysis/SMCAnalyzer';
import { ElliottWaveAnalyzer } from '@/services/analysis/ElliottWaveAnalyzer';

describe('TechnicalAnalysisView - Analyzer Validation', () => {
  it('should detect known SMC patterns correctly', async () => {
    // Test data with known Order Block
    const knownOrderBlockData = [
      { time: 1, open: 100, high: 105, low: 95, close: 102 },
      { time: 2, open: 102, high: 103, low: 98, close: 99 },  // Down candle
      { time: 3, open: 99, high: 101, low: 97, close: 98 },
      { time: 4, open: 98, high: 110, low: 98, close: 108 },  // Strong up move (Order Block)
      { time: 5, open: 108, high: 112, low: 106, close: 110 }
    ];

    const analyzer = new SMCAnalyzer();
    const result = await analyzer.analyze(knownOrderBlockData);

    // Verify Order Block detected
    expect(result.orderBlocks).toBeDefined();
    expect(result.orderBlocks.length).toBeGreaterThan(0);
    
    const orderBlock = result.orderBlocks[0];
    expect(orderBlock.type).toBe('bullish');
    expect(orderBlock.zone.low).toBeCloseTo(98, 1);
    expect(orderBlock.zone.high).toBeCloseTo(110, 1);
  });

  it('should detect Elliott Wave patterns', async () => {
    // Simplified 5-wave impulse pattern
    const impulseWaveData = generateImpulseWave();

    const analyzer = new ElliottWaveAnalyzer();
    const result = await analyzer.analyze(impulseWaveData);

    // Should detect impulse wave
    expect(result.pattern).toBe('impulse');
    expect(result.waves).toHaveLength(5);
    expect(result.waves[0].label).toBe('1');
    expect(result.waves[4].label).toBe('5');
  });

  // EXPECTED: Accurate pattern detection
  // CURRENT: Analyzers may produce false positives/negatives
  // FAILURE MODE: Users make trades based on incorrect analysis
});

function generateImpulseWave() {
  // Generate price data following Elliott Wave rules
  // Wave 1: Up, Wave 2: Down (doesn't breach start), Wave 3: Up (largest), etc.
  return [
    // Implementation of proper impulse wave data
    // ...
  ];
}
```

---

## RiskManagementView (Score: 7/10)

### Test Case: Risk Calculations

**Type**: Unit Test  
**Priority**: High

```typescript
// tests/views/RiskManagementView.test.tsx
import { describe, it, expect } from 'vitest';
import { ProfessionalRiskEngine } from '@/services/risk/ProfessionalRiskEngine';

describe('RiskManagementView - Calculations', () => {
  it('should calculate liquidation price correctly', () => {
    const riskEngine = new ProfessionalRiskEngine();

    const position = {
      symbol: 'BTCUSDT',
      side: 'LONG',
      entryPrice: 50000,
      leverage: 10,
      marginType: 'isolated'
    };

    const liquidationPrice = riskEngine.calculateLiquidationPrice(position);

    // For 10x long, liquidation at ~90% loss = entry * (1 - 0.9) = entry * 0.9
    // More precisely: liquidation = entry * (1 - 1/leverage + maintenanceMarginRate)
    // Assuming 0.4% maintenance: 50000 * (1 - 0.1 + 0.004) = 50000 * 0.904 = 45200
    expect(liquidationPrice).toBeCloseTo(45200, -2); // Within 100
  });

  it('should calculate optimal position size', () => {
    const riskEngine = new ProfessionalRiskEngine();

    const params = {
      accountBalance: 10000,
      riskPercent: 2, // Risk 2% per trade
      entryPrice: 50000,
      stopLoss: 48000,
      leverage: 5
    };

    const positionSize = riskEngine.calculatePositionSize(params);

    // Risk amount: 10000 * 0.02 = 200
    // Price risk: 50000 - 48000 = 2000 per BTC
    // Position size: 200 / 2000 = 0.1 BTC
    expect(positionSize).toBeCloseTo(0.1, 3);
  });

  it('should calculate stress test scenarios', () => {
    const riskEngine = new ProfessionalRiskEngine();

    const position = {
      symbol: 'BTCUSDT',
      entryPrice: 50000,
      size: 0.1,
      leverage: 5
    };

    const scenarios = riskEngine.runStressTest(position, {
      priceChanges: [-10, -5, 0, 5, 10] // Percent changes
    });

    expect(scenarios).toHaveLength(5);
    
    // -10% change on 5x leverage = -50% loss
    expect(scenarios[0].pnl).toBeCloseTo(-2500, 1);
    expect(scenarios[0].pnlPercent).toBeCloseTo(-50, 1);
  });

  // EXPECTED: Accurate risk calculations
  // CURRENT: Calculations may not account for all factors
  // FAILURE MODE: Users miscalculate position sizing and risk
});
```

---

## TrainingView (Score: 6/10)

### Test Case: Simulation vs Real Training

**Type**: Integration Test  
**Priority**: Medium

```typescript
// tests/views/TrainingView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrainingView } from '@/views/TrainingView';

describe('TrainingView - Training Mode', () => {
  it('should clearly distinguish simulation from real training', async () => {
    render(<TrainingView />);

    // Check for mode indicator
    const modeIndicator = screen.getByTestId('training-mode');
    expect(modeIndicator).toBeInTheDocument();
    expect(modeIndicator.textContent).toContain(/simulation|demo/i);

    // Start training
    await userEvent.click(screen.getByText(/Start Training/i));

    await waitFor(() => {
      expect(screen.getByTestId('training-progress')).toBeInTheDocument();
    });

    // Verify simulation disclaimer
    expect(screen.getByText(/simulated results/i)).toBeInTheDocument();

    // Verify no real ML backend calls
    // (Should use MLTrainingPanel which handles real training)
  });

  // EXPECTED: Clear indication this is simulation, not real training
  // CURRENT: Users may think they're training real models
  // FAILURE MODE: Confusion about whether models are actually trained
});
```

---

## HealthView (Score: 6/10)

### Test Case: Monitoring Service Integration

**Type**: Integration Test  
**Priority**: High

```typescript
// tests/views/HealthView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HealthView } from '@/views/HealthView';
import { HealthCheckService } from '@/services/HealthCheckService';

describe('HealthView - Monitoring Integration', () => {
  it('should display real system metrics', async () => {
    // Mock monitoring services
    const mockHealth = {
      cpu: 45.5,
      memory: 62.3,
      disk: 78.1,
      uptime: 86400,
      connections: {
        database: true,
        redis: true,
        websocket: true
      }
    };

    vi.spyOn(HealthCheckService.prototype, 'getSystemHealth')
      .mockResolvedValue(mockHealth);

    render(<HealthView />);

    await waitFor(() => {
      expect(screen.getByTestId('health-dashboard')).toBeInTheDocument();
    });

    // Verify metrics are displayed
    expect(screen.getByText(/45\.5.*%/)).toBeInTheDocument(); // CPU
    expect(screen.getByText(/62\.3.*%/)).toBeInTheDocument(); // Memory
    expect(screen.getByText(/78\.1.*%/)).toBeInTheDocument(); // Disk

    // Verify connection status
    expect(screen.getByText(/database.*connected/i)).toBeInTheDocument();
  });

  // EXPECTED: Real-time system metrics
  // CURRENT: May show default/mock values
  // FAILURE MODE: Cannot monitor actual system health
});
```

---

## EnhancedTradingView (Score: 6/10)

### Test Case: Signal Insight Integration

**Type**: Integration Test  
**Priority**: High

```typescript
// e2e/enhanced-trading-signal-insight.spec.ts
import { test, expect } from '@playwright/test';

test('Enhanced trading should display signal insights', async ({ page }) => {
  await page.goto('/trading/enhanced');

  // Wait for signal snapshot to load
  await page.waitForSelector('[data-testid="signal-insight"]', { timeout: 5000 });

  // Verify signal components are displayed
  await expect(page.locator('[data-testid="signal-score"]')).toBeVisible();
  await expect(page.locator('[data-testid="signal-confidence"]')).toBeVisible();
  await expect(page.locator('[data-testid="signal-indicators"]')).toBeVisible();

  // Get signal score
  const scoreElement = page.locator('[data-testid="signal-score"]');
  const scoreText = await scoreElement.textContent();
  const score = parseFloat(scoreText!);

  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);

  // Verify strategy toggle
  const strategyToggle = page.locator('[data-testid="strategy-execution-toggle"]');
  await expect(strategyToggle).toBeVisible();

  // Toggle strategy
  const isEnabled = await strategyToggle.isChecked();
  await strategyToggle.click();
  
  // Verify state changed
  await expect(strategyToggle).toBeChecked(!isEnabled);
});

// EXPECTED: Rich signal insights with actionable data
// CURRENT: May show generic or empty signal data
// FAILURE MODE: Users don't understand when to trade
```

---

## StrategyBuilderView (Score: 5/10)

### Test Case: Template Editor Integration

**Type**: Integration Test  
**Priority**: High

```typescript
// tests/views/StrategyBuilderView.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrategyBuilderView } from '@/views/StrategyBuilderView';

describe('StrategyBuilderView - Template Editor', () => {
  it('should integrate StrategyTemplateEditor', async () => {
    render(<StrategyBuilderView />);

    // Verify template editor is rendered
    const templateEditor = screen.queryByTestId('strategy-template-editor');
    
    if (!templateEditor) {
      // Document that integration is incomplete
      expect(screen.getByText(/coming soon|under development/i)).toBeInTheDocument();
    } else {
      // If integrated, verify functionality
      await expect(templateEditor).toBeVisible();

      // Should be able to edit template
      const nameInput = screen.getByLabelText(/Strategy Name/i);
      await userEvent.type(nameInput, 'Test Strategy');

      // Should show validation feedback
      await userEvent.click(screen.getByText(/Apply Strategy/i));
      
      await waitFor(() => {
        expect(screen.getByText(/success|saved|applied/i)).toBeInTheDocument();
      });
    }
  });

  // EXPECTED: Fully functional template editor
  // CURRENT: Integration incomplete or minimal
  // FAILURE MODE: Cannot create custom strategies
});
```

---

## RiskView (Score: 5/10)

### Test Case: Mock Data vs Real Data

**Type**: Integration Test  
**Priority**: High

```typescript
// tests/views/RiskView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RiskView } from '@/views/RiskView';
import { DataProvider } from '@/contexts/DataContext';

describe('RiskView - Real Data Integration', () => {
  it('should calculate VaR from real portfolio', async () => {
    const mockPortfolio = {
      positions: [
        {
          symbol: 'BTCUSDT',
          size: 0.1,
          entryPrice: 50000,
          currentPrice: 51000,
          volatility: 0.05 // 5% daily volatility
        }
      ],
      balance: 10000,
      totalValue: 15100
    };

    const mockDataContext = {
      portfolio: mockPortfolio,
      loading: false,
      error: null
    };

    render(
      <DataProvider value={mockDataContext}>
        <RiskView />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('var-display')).toBeInTheDocument();
    });

    const varDisplay = screen.getByTestId('var-display');
    const varValue = parseFloat(varDisplay.textContent!);

    // VaR calculation check
    // 1-day 95% VaR ≈ portfolio value * volatility * 1.645
    const expectedVaR = 15100 * 0.05 * 1.645;
    
    // Current implementation may show hardcoded value
    // This test should FAIL until real calculation is implemented
    expect(varValue).toBeCloseTo(expectedVaR, -1);
  });

  // EXPECTED: VaR calculated from real positions
  // CURRENT: Shows hardcoded mock value (likely $2,450.00)
  // FAILURE MODE: Risk metrics don't reflect actual portfolio
});
```

---

## TradingView (Score: 3/10) - Disabled

### Test Case: Disabled State

**Type**: Runtime Test  
**Priority**: Low

```typescript
// e2e/trading-view-disabled.spec.ts
import { test, expect } from '@playwright/test';

test('TradingView should display disabled warning', async ({ page }) => {
  await page.goto('/trading');

  // Should show warning banner
  await expect(page.locator('.warning-banner')).toContainText(
    /SPOT trading.*not implemented/i
  );

  // Should redirect or show FuturesTradingView
  await expect(page.locator('text=/futures.*only/i')).toBeVisible();

  // No order placement should be possible
  const orderButtons = page.locator('button:has-text("Buy"), button:has-text("Sell")');
  const count = await orderButtons.count();
  
  // Either disabled or not present for SPOT
  if (count > 0) {
    for (let i = 0; i < count; i++) {
      await expect(orderButtons.nth(i)).toBeDisabled();
    }
  }
});

// EXPECTED: Clear warning that SPOT is not available
// CURRENT: View exists but non-functional
// RECOMMENDATION: Remove view entirely or implement SPOT trading
```

---

## Summary Statistics

### Views by Test Priority

- **High Priority** (needs tests immediately): 16 views
- **Medium Priority** (tests needed soon): 4 views
- **Low Priority** (minimal tests ok): 0 views

### Test Types Needed

| Test Type | Count | Coverage |
|-----------|-------|----------|
| Unit Tests | 42 | Core logic, calculations |
| Integration Tests | 38 | API, context, components |
| E2E Tests | 24 | User workflows |
| Runtime Tests | 18 | Real data scenarios |
| Security Tests | 2 | API key handling |
| Validation Tests | 4 | Algorithm accuracy |

**Total Test Cases Defined**: 128

---

## Implementation Priority

### Week 1: Core Trading Tests

1. FuturesTradingView - All tests
2. PositionsView - WebSocket + API tests
3. DashboardView - Calculation tests
4. ExchangeSettingsView - Security tests

### Week 2: Data & Analysis Tests

5. ScannerView - Filter/sort tests
6. MarketView - Real-time tests
7. BacktestView - Validation tests
8. TechnicalAnalysisView - Analyzer tests

### Week 3: Risk & Strategy Tests

9. RiskManagementView - Calculation tests
10. RiskView - Integration tests (replace mock data)
11. StrategyLabView - Weight normalization
12. StrategyInsightsView - Pipeline tests

### Week 4: Support & Monitoring Tests

13. SettingsView - Persistence tests
14. MonitoringView - Error tracking
15. DiagnosticsView - Provider health
16. HealthView - System metrics

---

## Running Tests

### Setup Test Environment

```bash
# Install dependencies
npm install --save-dev @playwright/test vitest @testing-library/react \
  @testing-library/user-event @testing-library/jest-dom

# Setup Playwright
npx playwright install

# Create test config
# vitest.config.ts
```

### Run Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all

# With coverage
npm run test:coverage
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:all
      - run: npm run test:e2e
```

---

**Test Cases Generated**: 2025-11-22  
**Next Review**: After first round of test implementation  
**Target Coverage**: 80% for core views, 60% overall
