// tests/setup/mswServer.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const API_PREDICT = '/api/predict';
export const API_HEALTH = '/api/exchange/kucoin/health';

export const server = setupServer(
  // Default handlers can be overridden in tests via server.use(...)
  http.post(API_PREDICT, () => {
    // default happy path for unit tests
    return HttpResponse.json({ status: 'ok', data: { score: 0.5 } });
  }),
  http.get(API_HEALTH, () => {
    return HttpResponse.json({ status: 'ok', data: { healthy: true } });
  })
);

export function setupServerLifecycle() {
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
