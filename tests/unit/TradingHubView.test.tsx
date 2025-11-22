import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import TradingHubView from '../../src/views/TradingHubView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('TradingHubView loads unified trading interface', async () => {
  server.use(http.get('/api/trading/hub', () => HttpResponse.json({ status:'ok', data:{ markets:['spot','futures'] } })));
  render(<TradingHubView />);
  await waitFor(() => expect(screen.getByText(/trading/i)).toBeInTheDocument());
});
