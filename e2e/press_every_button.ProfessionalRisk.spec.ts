import { test, expect } from '@playwright/test';
import { attachEnvelopeChecker } from './helpers.assertNetworkEnvelopes';

test('ProfessionalRiskView — interact and validate', async ({ page }) => {
  const finish = attachEnvelopeChecker(page);
  await page.goto('http://localhost:3000/professional-risk', { waitUntil:'networkidle' });
  const btns = await page.$$('[role="button"], button');
  for (const b of btns) { if (await b.getAttribute('disabled')) continue; await b.click().catch(()=>{}); await page.waitForTimeout(150); }
  expect(/(mock|demo)/i.test(await page.locator('body').innerText())).toBeFalsy();
  finish();
});
