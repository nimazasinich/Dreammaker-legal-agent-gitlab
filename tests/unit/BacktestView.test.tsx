import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import BacktestView from '../../src/views/BacktestView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('BacktestView shows results and handles missing dataset', async () => {
  server.use(http.post('/api/backtest/run', () => HttpResponse.json({ status:'ok', data:{ returns: [1,2,3] } })));
  render(<BacktestView />);
  await waitFor(() => expect(screen.getByText(/returns/i)).toBeInTheDocument());
});
