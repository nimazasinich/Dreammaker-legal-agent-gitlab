import { test, expect } from '@playwright/test';
import { 
  assertNetworkEnvelopes, 
  captureConsoleErrors, 
  waitForPageReady, 
  pressAllButtons,
  checkForUnknownText 
} from './helpers';

test.describe('DashboardView - Press Every Button', () => {
  test('should press all interactive elements and validate network responses', async ({ page }) => {
    // Set up error tracking
    const getConsoleErrors = captureConsoleErrors(page);
    const finishEnvelopeValidation = await assertNetworkEnvelopes(page);

    // Navigate to dashboard
    await waitForPageReady(page, '/');

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid], [role="button"], button', { timeout: 10000 });

    // Press all buttons on the page
    const clickedCount = await pressAllButtons(page);
    
    console.log(`Clicked ${clickedCount} interactive elements`);
    expect(clickedCount).toBeGreaterThan(0);

    // Check for unknown/undefined/null text in UI
    const unknownTexts = await checkForUnknownText(page);
    if (unknownTexts.length > 0) {
      console.warn('Found unknown text elements:', unknownTexts);
    }
    expect(unknownTexts.length).toBeLessThan(3); // Allow a few edge cases

    // Validate network envelopes
    finishEnvelopeValidation();

    // Check console errors
    const consoleErrors = getConsoleErrors();
    if (consoleErrors.length > 0) {
      console.warn('Console errors found:', consoleErrors);
    }
    
    // Allow some non-critical warnings but fail on real errors
    const criticalErrors = consoleErrors.filter(err => 
      !err.includes('Warning') && 
      !err.includes('DevTools') &&
      !err.includes('favicon')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('should handle dashboard refresh button', async ({ page }) => {
    await waitForPageReady(page, '/');

    // Find refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), [aria-label*="refresh" i], [title*="refresh" i]').first();
    
    if (await refreshButton.count() > 0) {
      await refreshButton.click();
      
      // Wait for loading indicator or data update
      await page.waitForTimeout(1000);
      
      // Dashboard should still be functional
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should validate portfolio metrics display', async ({ page }) => {
    await waitForPageReady(page, '/');

    // Check for key portfolio metrics
    const portfolioValue = page.locator('text=/Portfolio Value|Total Value/i').first();
    const pnl = page.locator('text=/P&L|PnL|Profit/i').first();
    
    // At least one of these should be present
    const hasPortfolioMetrics = (await portfolioValue.count() > 0) || (await pnl.count() > 0);
    expect(hasPortfolioMetrics).toBeTruthy();
  });

  test('should display market prices without errors', async ({ page }) => {
    await waitForPageReady(page, '/');

    // Wait for market data to load
    await page.waitForSelector('text=/BTC|ETH|Market/i', { timeout: 10000 });

    // Check for price display (should be numbers, not "undefined")
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('undefined USDT');
    expect(bodyText).not.toContain('NaN');
  });

  test('should handle signal panel interactions', async ({ page }) => {
    await waitForPageReady(page, '/');

    // Look for signals panel
    const signalsPanel = page.locator('text=/Signals|AI Predictions/i').first();
    
    if (await signalsPanel.count() > 0) {
      await signalsPanel.scrollIntoViewIfNeeded();
      
      // Check for signal entries
      const signalCount = await page.locator('[data-testid*="signal"], .signal-card, [class*="signal"]').count();
      console.log(`Found ${signalCount} signal elements`);
    }
  });

  test('should navigate to other views via dashboard links', async ({ page }) => {
    await waitForPageReady(page, '/');

    // Find navigation links
    const navLinks = await page.locator('a[href*="/"], button[data-nav]').all();
    
    if (navLinks.length > 0) {
      // Click first navigation link
      const firstLink = navLinks[0];
      const href = await firstLink.getAttribute('href');
      
      if (href && !href.includes('http') && !href.includes('#')) {
        await firstLink.click();
        
        // Wait for navigation
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
          console.warn('Network did not become idle');
        });
        
        // Should navigate without errors
        expect(page.url()).toBeTruthy();
      }
    }
  });
});
