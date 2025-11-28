import { test, expect } from '@playwright/test';
import { attachEnvelopeChecker } from './helpers.assertNetworkEnvelopes';

test('StrategyInsights — interact with charts and validate envelopes', async ({ page }) => {
  const finish = attachEnvelopeChecker(page);
  await page.goto('http://localhost:3000/strategy-insights', { waitUntil:'networkidle' });
  const controls = await page.$$('[role="button"], button, svg, [data-testid]');
  for (const c of controls) {
    try {
      if (await c.getAttribute('disabled')) continue;
      await c.click().catch(()=>{ /* Ignore click errors */ });
      await page.waitForTimeout(150);
    } catch {
      // Ignore element interaction errors
    }
  }
  expect(/(mock|demo)/i.test(await page.locator('body').innerText())).toBeFalsy();
  finish();
});
