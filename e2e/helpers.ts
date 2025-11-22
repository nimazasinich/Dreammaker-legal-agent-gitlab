import { Page } from '@playwright/test';

/**
 * Helper to assert all network responses follow the envelope pattern
 * { status, code?, message?, data? }
 */
export async function assertNetworkEnvelopes(page: Page) {
  const errors: string[] = [];
  
  page.on('response', async (resp) => {
    try {
      const url = resp.url();
      
      // Only validate API responses
      if (!/\/api\//.test(url)) return;
      
      // Skip non-JSON responses
      const contentType = resp.headers()['content-type'] || '';
      if (!contentType.includes('application/json')) return;
      
      try {
        const json = await resp.json();
        
        // Validate envelope structure
        if (!('status' in json)) {
          errors.push(`Missing envelope 'status' field in response from ${url}`);
        }
        
        // Check for error responses
        if (json.status === 'error' && !json.code) {
          errors.push(`Error response from ${url} missing 'code' field`);
        }
        
      } catch (parseError) {
        errors.push(`Invalid JSON from ${url}: ${parseError}`);
      }
    } catch (e) {
      errors.push(`Error validating response: ${String(e)}`);
    }
  });

  // Return a finish function that throws if errors were collected
  return () => {
    if (errors.length > 0) {
      throw new Error(`Network envelope validation failed:\n${errors.join('\n')}`);
    }
  };
}

/**
 * Helper to check for console errors during test execution
 */
export function captureConsoleErrors(page: Page): () => string[] {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', (error) => {
    errors.push(`Page Error: ${error.message}`);
  });

  return () => errors;
}

/**
 * Wait for page to be fully loaded with network idle
 */
export async function waitForPageReady(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for React to mount
  await page.waitForFunction(() => {
    return document.querySelector('[data-testid], [role]') !== null;
  }, { timeout: 10000 }).catch(() => {
    console.warn('No interactive elements found on page');
  });
}

/**
 * Press all interactive buttons on the page
 */
export async function pressAllButtons(page: Page): Promise<number> {
  // Collect all interactive elements
  const buttons = await page.$$('[role="button"], button, [type="button"], [type="submit"]');
  let clickedCount = 0;

  for (const btn of buttons) {
    try {
      // Check if element is visible and enabled
      const isVisible = await btn.isVisible();
      const isDisabled = await btn.getAttribute('disabled');
      
      if (!isVisible || isDisabled !== null) {
        continue; // Skip hidden or disabled buttons
      }

      await btn.scrollIntoViewIfNeeded();
      await btn.click({ timeout: 3000 });
      clickedCount++;
      
      // Wait briefly for any side effects
      await page.waitForTimeout(200);
    } catch (err) {
      // Button might have disappeared or become unclickable - that's okay
      console.warn(`Could not click button: ${err}`);
    }
  }

  return clickedCount;
}

/**
 * Check for "unknown", "undefined", "null" text in the UI
 */
export async function checkForUnknownText(page: Page): Promise<string[]> {
  const unknownTexts: string[] = [];
  
  const elements = await page.$$('body *');
  
  for (const el of elements.slice(0, 100)) { // Limit to first 100 elements for performance
    try {
      const text = await el.textContent();
      if (text && /\b(unknown|undefined|null|NaN)\b/i.test(text)) {
        unknownTexts.push(text.trim().substring(0, 100));
      }
    } catch (e) {
      // Element might have disappeared
    }
  }
  
  return unknownTexts;
}
