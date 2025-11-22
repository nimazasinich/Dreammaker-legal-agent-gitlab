import React from 'react';
import { render, screen } from '@testing-library/react';
import StrategyBuilderView from '../../src/views/StrategyBuilderView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('StrategyBuilderView integrates with builder API', async () => {
  server.use(http.get('/api/strategy/builder', () => HttpResponse.json({ status:'ok', data:{ indicators:['RSI','MACD'] } })));
  render(<StrategyBuilderView />);
  expect(await screen.findByText(/RSI|MACD/i)).toBeInTheDocument();
});
