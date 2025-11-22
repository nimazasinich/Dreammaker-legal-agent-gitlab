import React from 'react';
import { render, screen } from '@testing-library/react';
import DiagnosticsView from '../../src/views/DiagnosticsView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('DiagnosticsView integrates with diagnostics API', async () => {
  server.use(http.post('/api/diagnostics/run', () => HttpResponse.json({ status:'ok', data:{ ok:true } })));
  render(<DiagnosticsView />);
  expect(await screen.findByText(/ok/i)).toBeInTheDocument();
});
