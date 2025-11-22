import React from 'react';
import { render, screen } from '@testing-library/react';
import HealthView from '../../src/views/HealthView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('HealthView integrates with system health API', async () => {
  server.use(http.get('/api/health', () => HttpResponse.json({ status:'ok', data:{ services:[{name:'db', ok:true}] } })));
  render(<HealthView />);
  expect(await screen.findByText(/db/i)).toBeInTheDocument();
});
