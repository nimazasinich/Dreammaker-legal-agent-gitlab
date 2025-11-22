import React from 'react';
import { render, screen } from '@testing-library/react';
import StrategyInsightsView from '../../src/views/StrategyInsightsView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('StrategyInsights integrates with insights API', async () => {
  server.use(http.get('/api/strategy/insights', () => HttpResponse.json({ status:'ok', data:{ metrics:{pf:2} } })));
  render(<StrategyInsightsView />);
  expect(await screen.findByText(/pf/i)).toBeInTheDocument();
});
