import { test, expect } from '@playwright/test';
import { attachEnvelopeChecker } from './helpers.assertNetworkEnvelopes';

test('EnhancedStrategyLabView — interact with strategy controls', async ({ page }) => {
  const finish = attachEnvelopeChecker(page);
  await page.goto('http://localhost:3000/enhanced-strategy-lab', { waitUntil:'networkidle' });
  const controls = await page.$$('[role="button"], button, input, select');
  for (const c of controls) { if (await c.getAttribute('disabled')) continue; await c.click().catch(()=>{}); await page.waitForTimeout(150); }
  expect(/(mock|demo)/i.test(await page.locator('body').innerText())).toBeFalsy();
  finish();
});
