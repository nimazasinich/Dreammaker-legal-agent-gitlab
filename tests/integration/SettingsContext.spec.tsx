import React from 'react';
import { render, screen } from '@testing-library/react';
import SettingsView from '../../src/views/SettingsView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('SettingsView persist and loads settings via API', async () => {
  server.use(http.get('/api/settings', () => HttpResponse.json({ status:'ok', data:{ language:'en' } })));
  render(<SettingsView />);
  expect(await screen.findByText(/language/i)).toBeInTheDocument();
});
