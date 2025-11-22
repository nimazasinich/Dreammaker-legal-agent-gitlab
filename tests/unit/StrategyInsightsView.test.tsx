import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StrategyInsightsView from '../../src/views/StrategyInsightsView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('StrategyInsights shows metrics from API', async () => {
  server.use(http.get('/api/strategy/insights', () => HttpResponse.json({ status:'ok', data:{ sharpe:1.1 } })));
  render(<StrategyInsightsView />);
  await waitFor(() => expect(screen.getByText(/sharpe/i)).toBeInTheDocument());
});
