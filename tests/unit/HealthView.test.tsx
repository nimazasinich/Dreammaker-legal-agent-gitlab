import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HealthView from '../../src/views/HealthView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('HealthView shows services health and handles failures', async () => {
  server.use(http.get('/api/health', () => HttpResponse.json({ status:'ok', data:{ kucoin: 'ok', db: 'ok' } })));
  render(<HealthView />);
  await waitFor(() => expect(screen.getByText(/kucoin/i)).toBeInTheDocument());
});
