import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/**
 * Standard API envelope for success responses
 */
export function successEnvelope(data: any) {
  return {
    status: 'ok',
    data,
  };
}

/**
 * Standard API envelope for error responses
 */
export function errorEnvelope(code: string, message: string) {
  return {
    status: 'error',
    code,
    message,
  };
}

/**
 * Create MSW handlers for common API endpoints
 */
export function createMockHandlers() {
  return [
    // Dashboard/Portfolio data
    http.get('/api/portfolio', () => {
      return HttpResponse.json(successEnvelope({
        totalValue: 10000,
        totalChangePercent: 5.2,
        dayPnL: 520,
        dayPnLPercent: 5.2,
        activePositions: 3,
        totalPositions: 5
      }));
    }),

    // Positions
    http.get('/api/positions', () => {
      return HttpResponse.json(successEnvelope([
        {
          id: 'pos-1',
          symbol: 'BTCUSDT',
          side: 'LONG',
          size: 0.5,
          entryPrice: 50000,
          currentPrice: 52000,
          pnl: 1000,
          pnlPercent: 4.0,
        }
      ]));
    }),

    // Market prices
    http.get('/api/market/prices', () => {
      return HttpResponse.json(successEnvelope([
        { symbol: 'BTC', price: 52000, change24h: 2.5 },
        { symbol: 'ETH', price: 3200, change24h: 1.8 },
        { symbol: 'SOL', price: 120, change24h: -0.5 }
      ]));
    }),

    // Signals
    http.get('/api/signals', () => {
      return HttpResponse.json(successEnvelope([
        {
          symbol: 'BTCUSDT',
          action: 'BUY',
          confidence: 0.85,
          timeframe: '1h',
          timestamp: Date.now()
        }
      ]));
    }),

    // AI Prediction
    http.post('/api/predict', () => {
      return HttpResponse.json(successEnvelope({
        score: 0.7,
        action: 'BUY',
        confidence: 0.75
      }));
    }),

    // Exchange health
    http.get('/api/exchange/:exchange/health', () => {
      return HttpResponse.json(successEnvelope({
        healthy: true,
        latency: 45
      }));
    }),

    // Risk metrics - returns mock data
    http.get('/api/risk/portfolio', () => {
      return HttpResponse.json(successEnvelope({
        mock: true,
        valueAtRisk: -2450,
        maxDrawdown: -12.3,
        sharpeRatio: 1.45
      }));
    }),

    // Dashboard summary
    http.get('/api/dashboard/summary', () => {
      return HttpResponse.json(successEnvelope({
        total: 123,
        active: 5,
        pnl: 520
      }));
    }),

    // Futures positions
    http.get('/api/futures/positions', () => {
      return HttpResponse.json(successEnvelope([]));
    }),

    // Strategy pipeline
    http.get('/api/strategy/pipeline', () => {
      return HttpResponse.json(successEnvelope({
        phase1: { score: 0.8 },
        phase2: { score: 0.7 },
        phase3: { score: 0.9 }
      }));
    }),
  ];
}

/**
 * Create and configure MSW server
 */
export function createMockServer() {
  return setupServer(...createMockHandlers());
}

/**
 * Setup MSW server for tests
 * Call this in beforeAll
 */
export function setupMSW(server: ReturnType<typeof createMockServer>) {
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
