import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardView from '../../src/views/DashboardView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('DashboardView integrates with overview API', async () => {
  server.use(http.get('/api/dashboard/overview', () => HttpResponse.json({ status:'ok', data:{ pnl:500 } })));
  render(<DashboardView />);
  expect(await screen.findByText(/pnl/i)).toBeInTheDocument();
});
