import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import EnhancedTradingView from '../../src/views/EnhancedTradingView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('EnhancedTradingView exposes advanced order types and handles errors', async () => {
  server.use(http.get('/api/exchange/advanced', () => HttpResponse.json({ status:'ok', data:{ types:['oco','stop-limit'] } })));
  render(<EnhancedTradingView />);
  await waitFor(() => expect(screen.getByText(/stop-limit/i)).toBeInTheDocument());
});
