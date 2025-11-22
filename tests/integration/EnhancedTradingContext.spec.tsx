import React from 'react';
import { render, screen } from '@testing-library/react';
import EnhancedTradingView from '../../src/views/EnhancedTradingView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('EnhancedTradingView integrates with advanced exchange API', async () => {
  server.use(http.get('/api/exchange/advanced', () => HttpResponse.json({ status:'ok', data:{ types:['oco'] } })));
  render(<EnhancedTradingView />);
  expect(await screen.findByText(/oco/i)).toBeInTheDocument();
});
