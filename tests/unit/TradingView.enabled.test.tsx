import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import TradingView from '../../src/views/TradingView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('TradingView loads order form when enabled', async () => {
  server.use(
    http.get('/api/exchange/config', () => HttpResponse.json({ status:'ok', data:{ spot:true } })),
    http.post('/api/order', () => HttpResponse.json({ status:'ok', data:{ orderId:'o1' } }))
  );
  render(<TradingView />);
  expect(await screen.findByRole('form')).toBeInTheDocument();
});
