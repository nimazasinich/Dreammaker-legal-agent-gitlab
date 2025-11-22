import { test, expect } from '@playwright/test';
import { attachEnvelopeChecker } from './helpers.assertNetworkEnvelopes';

test('MarketView — press controls and validate envelopes', async ({ page }) => {
  const finish = attachEnvelopeChecker(page);
  await page.goto('http://localhost:3000/market', { waitUntil:'networkidle' });
  const controls = await page.$$('[role="button"], button, [role="switch"], select');
  for (const c of controls) { if (await c.getAttribute('disabled')) continue; await c.click().catch(()=>{}); await page.waitForTimeout(200); }
  expect(/(mock|demo|example)/i.test(await page.locator('body').innerText())).toBeFalsy();
  finish();
});
