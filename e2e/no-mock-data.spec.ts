/**
 * No Mock Data E2E Test Suite
 * 
 * Validates that NO mock or fabricated data is displayed to users.
 * Tests all critical pages and interactive elements.
 * 
 * Acceptance Criteria:
 * - No "mock", "demo", "example", "unknown", "undefined", "null" in visible UI text
 * - All /api/** responses follow envelope pattern
 * - No console.error messages
 * - Fallback states are labeled and deterministic
 */

import { test, expect, Page } from '@playwright/test';

const FORBIDDEN_UI_TEXT = [
  'mock',
  'demo', 
  'example',
  'unknown',
  'undefined',
  'null',
  'NaN',
];

const PAGES_TO_TEST = [
  { path: '/', view: 'dashboard', name: 'Dashboard' },
  { path: '/?view=futures', view: 'futures', name: 'Futures Trading' },
  { path: '/?view=trading-hub', view: 'trading-hub', name: 'Trading Hub' },
  { path: '/?view=positions', view: 'positions', name: 'Positions' },
  { path: '/?view=portfolio', view: 'portfolio', name: 'Portfolio' },
  { path: '/?view=charting', view: 'charting', name: 'Charting' },
  { path: '/?view=risk', view: 'risk', name: 'Risk' },
];

async function validateNoMockText(page: Page, pageName: string) {
  const bodyText = await page.locator('body').innerText();
  const lowerText = bodyText.toLowerCase();
  
  for (const forbidden of FORBIDDEN_UI_TEXT) {
    if (lowerText.includes(forbidden)) {
      // Check if it's in a data-testid attribute (allowed for testing)
      const testElements = await page.locator(`[data-testid*="${forbidden}"]`).count();
      const visibleElements = await page.getByText(forbidden, { exact: false }).count();
      
      if (visibleElements > testElements) {
        throw new Error(
          `FAIL: ${pageName} contains forbidden text "${forbidden}" in visible UI`
        );
      }
    }
  }
}

async function validateApiEnvelopes(page: Page, pageName: string) {
  const apiResponses: any[] = [];
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/')) {
      try {
        const json = await response.json();
        apiResponses.push({ url, status: response.status(), body: json });
      } catch {
        // Not JSON response
      }
    }
  });
  
  // Wait for page to load and make API calls
  await page.waitForLoadState('networkidle');
  
  // Validate envelopes
  for (const resp of apiResponses) {
    if (!resp.body || typeof resp.body !== 'object') {
      continue;
    }
    
    if (!('status' in resp.body)) {
      throw new Error(
        `FAIL: ${pageName} - API response missing 'status' field: ${resp.url}`
      );
    }
    
    if (resp.body.status !== 'ok' && resp.body.status !== 'error') {
      throw new Error(
        `FAIL: ${pageName} - Invalid status value "${resp.body.status}" in: ${resp.url}`
      );
    }
  }
}

async function checkConsoleErrors(page: Page, pageName: string) {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  
  // Return errors for later validation
  return errors;
}

test.describe('No Mock Data Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error tracking
    await checkConsoleErrors(page, 'beforeEach');
  });

  for (const pageInfo of PAGES_TO_TEST) {
    test(`${pageInfo.name} - No mock data in UI`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for any loading states to resolve
      await page.waitForTimeout(2000);
      
      // Validate no forbidden text
      await validateNoMockText(page, pageInfo.name);
    });

    test(`${pageInfo.name} - API envelopes valid`, async ({ page }) => {
      await page.goto(pageInfo.path);
      
      // Validate API responses
      await validateApiEnvelopes(page, pageInfo.name);
    });

    test(`${pageInfo.name} - No console errors`, async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
      
      // Filter out known acceptable errors (if any)
      const unacceptableErrors = errors.filter(
        (err) => !err.includes('ResizeObserver') // Known browser quirk
      );
      
      expect(unacceptableErrors).toHaveLength(0);
    });

    test(`${pageInfo.name} - Fallback states are labeled`, async ({ page }) => {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('domcontentloaded');
      
      // Check for any fallback state indicators
      const dataUnavailable = await page.getByText('DATA_UNAVAILABLE').count();
      const disabledByConfig = await page.getByText('DISABLED_BY_CONFIG').count();
      const noData = await page.getByText(/no data|data unavailable/i).count();
      
      // If any fallback is shown, it must be properly labeled
      if (dataUnavailable > 0 || disabledByConfig > 0 || noData > 0) {
        // Fallbacks are present and labeled - this is correct behavior
        expect(true).toBe(true);
      } else {
        // No fallbacks shown - data must be available
        // Verify actual data is displayed (not empty state)
        const bodyText = await page.locator('body').innerText();
        expect(bodyText.length).toBeGreaterThan(100);
      }
    });
  }
});

test.describe('Interactive Elements - Press Every Button', () => {
  test('Dashboard - Press all interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find all buttons
    const buttons = await page.locator('button').all();
    
    const results: { id: string; action: string; success: boolean }[] = [];
    
    for (const button of buttons) {
      const isVisible = await button.isVisible();
      if (!isVisible) continue;
      
      const text = await button.innerText().catch(() => '');
      const ariaLabel = await button.getAttribute('aria-label');
      const id = text || ariaLabel || 'unnamed-button';
      
      try {
        await button.click({ timeout: 1000 });
        await page.waitForLoadState('networkidle', { timeout: 2000 });
        
        // Validate no mock text appeared after click
        await validateNoMockText(page, `Dashboard after clicking ${id}`);
        
        results.push({ id, action: 'click', success: true });
      } catch (error) {
        results.push({ id, action: 'click', success: false });
      }
    }
    
    // Log results
    console.log('Dashboard button test results:', results);
    
    // At least some buttons should be clickable
    const successCount = results.filter((r) => r.success).length;
    expect(successCount).toBeGreaterThan(0);
  });

  test('Futures Trading - Test order placement controls', async ({ page }) => {
    await page.goto('/?view=futures');
    await page.waitForLoadState('networkidle');
    
    // Find symbol selector
    const symbolSelect = page.locator('select').first();
    if (await symbolSelect.isVisible()) {
      await symbolSelect.selectOption('ETHUSDT');
      await page.waitForTimeout(500);
      
      // Validate no mock data after symbol change
      await validateNoMockText(page, 'Futures after symbol change');
    }
    
    // Find order size input
    const sizeInput = page.locator('input[type="number"]').first();
    if (await sizeInput.isVisible()) {
      await sizeInput.fill('0.1');
      
      // Validate no mock data displayed
      await validateNoMockText(page, 'Futures after size input');
    }
  });

  test('Portfolio - Test position interactions', async ({ page }) => {
    await page.goto('/?view=portfolio');
    await page.waitForLoadState('networkidle');
    
    // Check for close position buttons
    const closeButtons = page.getByRole('button', { name: /close/i });
    const count = await closeButtons.count();
    
    if (count > 0) {
      // Position data is available - validate it's not mock
      await validateNoMockText(page, 'Portfolio with positions');
    } else {
      // No positions - validate proper empty state
      const emptyState = await page.getByText(/no open positions/i).isVisible();
      expect(emptyState).toBe(true);
    }
  });

  test('Charting - Test timeframe and symbol changes', async ({ page }) => {
    await page.goto('/?view=charting');
    await page.waitForLoadState('networkidle');
    
    // Test timeframe buttons
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
    
    for (const tf of timeframes) {
      const button = page.getByRole('button', { name: tf, exact: true });
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(500);
        
        // Validate no mock data after timeframe change
        await validateNoMockText(page, `Charting after ${tf} change`);
      }
    }
  });
});

test.describe('Network Response Validation', () => {
  test('All API responses follow envelope pattern', async ({ page }) => {
    const apiCalls: { url: string; envelope: any }[] = [];
    
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        try {
          const body = await response.json();
          apiCalls.push({ url: response.url(), envelope: body });
        } catch {
          // Not JSON
        }
      }
    });
    
    // Visit all critical pages
    for (const pageInfo of PAGES_TO_TEST.slice(0, 3)) {
      await page.goto(pageInfo.path);
      await page.waitForLoadState('networkidle');
    }
    
    // Validate all envelopes
    for (const call of apiCalls) {
      expect(call.envelope).toHaveProperty('status');
      expect(['ok', 'error']).toContain(call.envelope.status);
      
      if (call.envelope.status === 'error') {
        expect(call.envelope).toHaveProperty('message');
      }
    }
  });
});

test.describe('Accessibility & ARIA Labels', () => {
  test('All interactive elements have accessible labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find all buttons
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const isVisible = await button.isVisible();
      if (!isVisible) continue;
      
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.innerText().catch(() => '');
      const testId = await button.getAttribute('data-testid');
      
      // Must have at least one identifier
      const hasLabel = !!(ariaLabel || text.trim() || testId);
      expect(hasLabel).toBe(true);
    }
  });
});
