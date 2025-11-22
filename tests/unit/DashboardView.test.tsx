import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardView from '../../src/views/DashboardView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('DashboardView renders overview widgets and loads data', async () => {
  server.use(http.get('/api/dashboard/overview', () => HttpResponse.json({ status:'ok', data:{ balance:10000, positions:5 } })));
  render(<DashboardView />);
  await waitFor(() => expect(screen.getByText(/balance/i)).toBeInTheDocument());
});
