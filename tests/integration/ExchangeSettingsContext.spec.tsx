import React from 'react';
import { render, screen } from '@testing-library/react';
import ExchangeSettingsView from '../../src/views/ExchangeSettingsView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('ExchangeSettings test connection uses API', async () => {
  server.use(http.get('/api/exchange/test', () => HttpResponse.json({ status:'ok', data:{ success:true } })));
  render(<ExchangeSettingsView />);
  expect(await screen.findByText(/success/i)).toBeInTheDocument();
});
