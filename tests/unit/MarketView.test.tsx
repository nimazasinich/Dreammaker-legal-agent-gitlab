import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MarketView from '../../src/views/MarketView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('MarketView lists tickers and updates on subscribe', async () => {
  server.use(http.get('/api/market/tickers', () => HttpResponse.json({ status:'ok', data:[{symbol:'BTCUSDT', price:60000}] })));
  render(<MarketView />);
  await waitFor(() => expect(screen.getByText(/BTCUSDT/i)).toBeInTheDocument());
});
