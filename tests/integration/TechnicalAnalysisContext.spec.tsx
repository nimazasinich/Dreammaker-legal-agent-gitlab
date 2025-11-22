import React from 'react';
import { render, screen } from '@testing-library/react';
import TechnicalAnalysisView from '../../src/views/TechnicalAnalysisView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('TechnicalAnalysis reacts to indicator API', async () => {
  server.use(http.get('/api/ta/indicators', () => HttpResponse.json({ status:'ok', data:[{name:'MACD'}] })));
  render(<TechnicalAnalysisView />);
  expect(await screen.findByText(/MACD/i)).toBeInTheDocument();
});
