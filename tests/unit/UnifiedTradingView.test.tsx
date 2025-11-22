import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import UnifiedTradingView from '../../src/views/UnifiedTradingView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('UnifiedTradingView renders unified interface for spot and futures', async () => {
  server.use(http.get('/api/trading/unified', () => HttpResponse.json({ status:'ok', data:{ modes:['spot','futures'] } })));
  render(<UnifiedTradingView />);
  await waitFor(() => expect(screen.getByText(/spot|futures/i)).toBeInTheDocument());
});
