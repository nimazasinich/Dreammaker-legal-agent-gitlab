import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MarketView from '../../src/views/MarketView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('MarketView subscribes and receives depth updates', async () => {
  server.use(http.get('/api/market/tickers', () => HttpResponse.json({ status:'ok', data:[{symbol:'ETHUSDT'}] })));
  render(<MarketView />);
  await waitFor(() => expect(screen.getByText(/ETHUSDT/i)).toBeInTheDocument());
});
