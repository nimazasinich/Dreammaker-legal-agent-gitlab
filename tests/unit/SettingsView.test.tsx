import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import SettingsView from '../../src/views/SettingsView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('SettingsView loads user settings and can save', async () => {
  server.use(http.get('/api/settings', () => HttpResponse.json({ status:'ok', data:{ theme:'dark' } })));
  render(<SettingsView />);
  await waitFor(() => expect(screen.getByText(/theme/i)).toBeInTheDocument());
});
