import React from 'react';
import { render, screen } from '@testing-library/react';
import UnifiedTradingView from '../../src/views/UnifiedTradingView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('UnifiedTradingView integrates with unified trading API', async () => {
  server.use(http.get('/api/trading/unified', () => HttpResponse.json({ status:'ok', data:{ activeMode:'futures' } })));
  render(<UnifiedTradingView />);
  expect(await screen.findByText(/futures/i)).toBeInTheDocument();
});
