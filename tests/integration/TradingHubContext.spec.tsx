import React from 'react';
import { render, screen } from '@testing-library/react';
import TradingHubView from '../../src/views/TradingHubView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('TradingHubView integrates with trading hub API', async () => {
  server.use(http.get('/api/trading/hub', () => HttpResponse.json({ status:'ok', data:{ enabled:true } })));
  render(<TradingHubView />);
  expect(await screen.findByText(/enabled/i)).toBeInTheDocument();
});
