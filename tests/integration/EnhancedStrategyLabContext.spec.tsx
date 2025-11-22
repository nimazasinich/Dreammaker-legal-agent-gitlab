import React from 'react';
import { render, screen } from '@testing-library/react';
import EnhancedStrategyLabView from '../../src/views/EnhancedStrategyLabView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('EnhancedStrategyLabView integrates with strategy lab API', async () => {
  server.use(http.get('/api/strategy/lab', () => HttpResponse.json({ status:'ok', data:{ strategies:[{id:'s1'}] } })));
  render(<EnhancedStrategyLabView />);
  expect(await screen.findByText(/s1/i)).toBeInTheDocument();
});
