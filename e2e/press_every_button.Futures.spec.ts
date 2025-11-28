// e2e/press_every_button.Futures.spec.ts
import { test, expect } from '@playwright/test';
import { attachEnvelopeChecker } from './helpers.assertNetworkEnvelopes';

test('FuturesTradingView — press every interactive element and validate envelopes', async ({ page }) => {
  // Attach envelope assertions collector
  const finishChecks = attachEnvelopeChecker(page);

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      throw new Error(`Console error: ${msg.text()}`);
    }
  });

  await page.goto('http://localhost:3000/futures', { waitUntil: 'networkidle' });

  // gather clickable interactive elements but exclude disabled ones
  const clickableSelectors = [
    'button[aria-label]',
    '[role="button"]',
    'a[role="button"]',
    'input[type="button"]',
  ];

  const elements = await page.$$(`${clickableSelectors.join(',')}`);

  for (const el of elements) {
    // Skip if disabled
    const disabled = await el.getAttribute('disabled');
    if (disabled) continue;
    await el.scrollIntoViewIfNeeded();
    await el.click({ timeout: 3000 });
    // wait shortly for network and UI updates
    await page.waitForTimeout(300);
  }

  // Ensure page doesn't display forbidden words (mock/demo/unknown/null/undefined)
  const pageText = await page.locator('body').innerText();
  const forbidden = /(mock|demo|example|unknown|null|undefined)/i;
  expect(forbidden.test(pageText)).toBeFalsy();

  // Finalize envelope checks; will throw on errors
  finishChecks();
});
