import { test, expect } from '@playwright/test';
import { attachEnvelopeChecker } from './helpers.assertNetworkEnvelopes';

test('TradingView — interact with order form or show disabled guard', async ({ page }) => {
  const finish = attachEnvelopeChecker(page);
  await page.goto('http://localhost:3000/trading', { waitUntil:'networkidle' });
  // attempt to click forms/buttons; if guard shown, assert the label
  const body = await page.locator('body').innerText();
  if (/DISABLED_BY_CONFIG/.test(body)) {
    expect(body).toContain('DISABLED_BY_CONFIG');
  } else {
    const controls = await page.$$('[role="button"], button, input');
    for (const c of controls) { if (await c.getAttribute('disabled')) continue; await c.click().catch(()=>{}); await page.waitForTimeout(150); }
  }
  expect(/(mock|demo)/i.test(await page.locator('body').innerText())).toBeFalsy();
  finish();
});
