import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StrategyBuilderView from '../../src/views/StrategyBuilderView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('StrategyBuilderView renders strategy builder interface', async () => {
  server.use(http.get('/api/strategy/builder', () => HttpResponse.json({ status:'ok', data:{ templates:['trend','mean-reversion'] } })));
  render(<StrategyBuilderView />);
  await waitFor(() => expect(screen.getByText(/trend|strategy/i)).toBeInTheDocument());
});
