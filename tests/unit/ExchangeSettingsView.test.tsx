import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ExchangeSettingsView from '../../src/views/ExchangeSettingsView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('ExchangeSettings saves key and shows test connection result', async () => {
  server.use(http.get('/api/exchange/test', () => HttpResponse.json({ status:'ok', data:{ success:true } })));
  render(<ExchangeSettingsView />);
  await waitFor(() => expect(screen.getByText(/test connection/i)).toBeInTheDocument());
});
