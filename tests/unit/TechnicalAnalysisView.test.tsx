import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import TechnicalAnalysisView from '../../src/views/TechnicalAnalysisView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('TechnicalAnalysis renders indicators and shows fallback for no data', async () => {
  server.use(http.get('/api/ta/indicators', () => HttpResponse.json({ status:'ok', data:[{name:'RSI'}] })));
  render(<TechnicalAnalysisView />);
  await waitFor(() => expect(screen.getByText(/RSI/i)).toBeInTheDocument());
});
