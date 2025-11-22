import React from 'react';
import { render, screen } from '@testing-library/react';
import TradingView from '../../src/views/TradingView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('TradingView shows DISABLED_BY_CONFIG when spot disabled', async () => {
  server.use(http.get('/api/exchange/config', () => HttpResponse.json({ status:'error', code:'DISABLED_BY_CONFIG', message:'spot disabled' })));
  render(<TradingView />);
  expect(await screen.findByText(/DISABLED_BY_CONFIG/i)).toBeInTheDocument();
});
