import { test, expect } from '@playwright/test';
import { 
  assertNetworkEnvelopes, 
  captureConsoleErrors, 
  waitForPageReady 
} from './helpers';

test.describe('FuturesTradingView - Complete Trading Flow', () => {
  test('should load futures trading view without errors', async ({ page }) => {
    const getConsoleErrors = captureConsoleErrors(page);
    const finishEnvelopeValidation = await assertNetworkEnvelopes(page);

    await waitForPageReady(page, '/futures');

    // Check for main elements
    await expect(page.locator('text=/Futures Trading|Trading/i').first()).toBeVisible({ timeout: 10000 });

    // Validate envelopes
    finishEnvelopeValidation();

    // Check console errors
    const consoleErrors = getConsoleErrors();
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('Warning') && !err.includes('DevTools')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('should display order form with all required fields', async ({ page }) => {
    await waitForPageReady(page, '/futures');

    // Check for order form elements
    await expect(page.locator('text=/Place Order/i').first()).toBeVisible();
    
    // Check for symbol selector
    const symbolSelector = page.locator('select, [role="combobox"], [placeholder*="symbol" i]').first();
    if (await symbolSelector.count() > 0) {
      await expect(symbolSelector).toBeVisible();
    }

    // Check for buy/sell buttons
    const buyButton = page.locator('button:has-text("Buy"), button:has-text("LONG")').first();
    const sellButton = page.locator('button:has-text("Sell"), button:has-text("SHORT")').first();
    
    expect((await buyButton.count()) + (await sellButton.count())).toBeGreaterThan(0);
  });

  test('should toggle between signals-only and auto-trade modes', async ({ page }) => {
    await waitForPageReady(page, '/futures');

    // Look for mode toggle buttons
    const signalsButton = page.locator('button:has-text("Signals Only"), button:has-text("Signals")').first();
    const autoTradeButton = page.locator('button:has-text("Auto Trade"), button:has-text("Auto")').first();

    if (await signalsButton.count() > 0 && await autoTradeButton.count() > 0) {
      await signalsButton.click();
      await page.waitForTimeout(500);
      
      await autoTradeButton.click();
      await page.waitForTimeout(500);

      // Should switch modes without errors
      expect(page.url()).toContain('/futures');
    }
  });

  test('should display positions and orders tables', async ({ page }) => {
    await waitForPageReady(page, '/futures');

    // Check for positions section
    const positionsHeading = page.locator('text=/Positions|Open Positions/i').first();
    await expect(positionsHeading).toBeVisible({ timeout: 5000 });

    // Check for orders section
    const ordersHeading = page.locator('text=/Orders|Open Orders|Pending/i').first();
    if (await ordersHeading.count() > 0) {
      await expect(ordersHeading).toBeVisible();
    }
  });

  test('should validate order form inputs', async ({ page }) => {
    await waitForPageReady(page, '/futures');

    // Find size input
    const sizeInput = page.locator('input[type="number"]').first();
    
    if (await sizeInput.count() > 0) {
      await sizeInput.clear();
      await sizeInput.fill('0.1');
      
      // Input should accept valid values
      await expect(sizeInput).toHaveValue('0.1');
    }
  });

  test('should show balance information', async ({ page }) => {
    await waitForPageReady(page, '/futures');

    // Look for balance display
    const balanceText = page.locator('text=/Balance|Available|Wallet/i').first();
    
    if (await balanceText.count() > 0) {
      await expect(balanceText).toBeVisible();
    }
  });

  test('should handle leverage adjustment', async ({ page }) => {
    await waitForPageReady(page, '/futures');

    // Find leverage slider or input
    const leverageSlider = page.locator('input[type="range"]').first();
    
    if (await leverageSlider.count() > 0) {
      const currentValue = await leverageSlider.getAttribute('value');
      console.log(`Current leverage: ${currentValue}`);
      
      // Adjust leverage
      await leverageSlider.fill('10');
      await page.waitForTimeout(300);
      
      // Should update without errors
      expect(page.url()).toContain('/futures');
    }
  });

  test('should display entry plan when available', async ({ page }) => {
    await waitForPageReady(page, '/futures');

    // Wait for entry plan to load
    await page.waitForTimeout(2000);

    // Look for entry plan section
    const entryPlanSection = page.locator('text=/Entry Plan|Stop Loss|Take Profit/i').first();
    
    if (await entryPlanSection.count() > 0) {
      await expect(entryPlanSection).toBeVisible();
      console.log('Entry plan section found');
    } else {
      console.log('Entry plan section not available');
    }
  });

  test('should handle close position action', async ({ page }) => {
    await waitForPageReady(page, '/futures');

    // Look for close position button (only if positions exist)
    const closeButton = page.locator('button:has-text("Close Position"), button:has-text("Close")').first();
    
    if (await closeButton.count() > 0) {
      await closeButton.click();
      
      // Should show confirmation modal
      await page.waitForTimeout(500);
      
      // Look for confirmation dialog
      const confirmDialog = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
      if (await confirmDialog.count() > 0) {
        // Cancel the action
        const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("No")').first();
        if (await cancelButton.count() > 0) {
          await cancelButton.click();
        }
      }
    }
  });

  test('should validate network responses follow envelope pattern', async ({ page }) => {
    const finishEnvelopeValidation = await assertNetworkEnvelopes(page);

    await waitForPageReady(page, '/futures');

    // Wait for all API calls to complete
    await page.waitForTimeout(3000);

    // Validate all responses followed the envelope pattern
    finishEnvelopeValidation();
  });
});
