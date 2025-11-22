# Test Helpers

This directory contains reusable test utilities for the project.

## Files

### `msw-setup.ts`
Mock Service Worker (MSW) configuration for mocking API endpoints in tests.

**Usage:**
```typescript
import { createMockServer, setupMSW } from '../helpers/msw-setup';

const server = createMockServer();
setupMSW(server);
```

**Functions:**
- `successEnvelope(data)` - Create standard success response envelope
- `errorEnvelope(code, message)` - Create standard error response envelope
- `createMockHandlers()` - Get default API mock handlers
- `createMockServer()` - Create MSW server instance
- `setupMSW(server)` - Setup server lifecycle (beforeAll/afterAll)

## E2E Helpers

Located in `e2e/helpers.ts`:

### `assertNetworkEnvelopes(page)`
Validates all API responses follow the envelope pattern `{status, code?, message?, data?}`.

**Usage:**
```typescript
import { assertNetworkEnvelopes } from './helpers';

const finishValidation = await assertNetworkEnvelopes(page);
// ... run tests ...
finishValidation(); // Throws if any envelope errors found
```

### `captureConsoleErrors(page)`
Captures console.error and page errors during test execution.

**Usage:**
```typescript
const getErrors = captureConsoleErrors(page);
// ... run tests ...
const errors = getErrors();
expect(errors.length).toBe(0);
```

### `pressAllButtons(page)`
Presses all interactive buttons on the page.

**Returns:** Number of buttons clicked

### `checkForUnknownText(page)`
Checks for "unknown", "undefined", "null", or "NaN" text in the UI.

**Returns:** Array of found text snippets

### `waitForPageReady(page, url)`
Waits for page to be fully loaded with network idle and interactive elements.
