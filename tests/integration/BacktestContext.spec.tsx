import React from 'react';
import { render, screen } from '@testing-library/react';
import BacktestView from '../../src/views/BacktestView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('BacktestView integrates with backtest API', async () => {
  server.use(http.post('/api/backtest/run', () => HttpResponse.json({ status:'ok', data:{ summary:{sharpe:1.2} } })));
  render(<BacktestView />);
  expect(await screen.findByText(/sharpe/i)).toBeInTheDocument();
});
