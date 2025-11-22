// e2e/helpers.assertNetworkEnvelopes.ts
import { Page } from '@playwright/test';

export function attachEnvelopeChecker(page: Page) {
  const errors: string[] = [];
  page.on('response', async (resp) => {
    try {
      const url = resp.url();
      if (!/\/api\//.test(url)) return;
      const text = await resp.text().catch(() => null);
      if (!text) {
        errors.push(`Empty response body from ${url}`);
        return;
      }
      // Try parse json
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        errors.push(`Invalid JSON from ${url}`);
        return;
      }
      if (!('status' in json)) {
        errors.push(`Missing "status" in envelope from ${url}`);
      }
    } catch (e) {
      errors.push(String(e));
    }
  });

  return () => {
    if (errors.length) throw new Error(errors.join('\n'));
  };
}
