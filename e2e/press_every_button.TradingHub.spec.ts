import { test, expect } from '@playwright/test';
import { attachEnvelopeChecker } from './helpers.assertNetworkEnvelopes';

test('TradingHubView — interact with hub controls', async ({ page }) => {
  const finish = attachEnvelopeChecker(page);
  await page.goto('http://localhost:3000/trading-hub', { waitUntil:'networkidle' });
  const controls = await page.$$('[role="button"], button, input, select, [role="tab"]');
  for (const c of controls) { if (await c.getAttribute('disabled')) continue; await c.click().catch(()=>{}); await page.waitForTimeout(150); }
  expect(/(mock|demo)/i.test(await page.locator('body').innerText())).toBeFalsy();
  finish();
});
