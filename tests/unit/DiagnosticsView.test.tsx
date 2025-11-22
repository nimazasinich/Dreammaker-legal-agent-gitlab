import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DiagnosticsView from '../../src/views/DiagnosticsView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('DiagnosticsView runs diagnostics and shows report', async () => {
  server.use(http.post('/api/diagnostics/run', () => HttpResponse.json({ status:'ok', data:{ report:'ok' } })));
  render(<DiagnosticsView />);
  await waitFor(() => expect(screen.getByText(/report/i)).toBeInTheDocument());
});
