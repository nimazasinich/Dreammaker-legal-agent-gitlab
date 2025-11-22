import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import EnhancedStrategyLabView from '../../src/views/EnhancedStrategyLabView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('EnhancedStrategyLabView loads strategies and shows advanced features', async () => {
  server.use(http.get('/api/strategy/lab', () => HttpResponse.json({ status:'ok', data:{ strategies:[{id:'s1',name:'MA Cross'}] } })));
  render(<EnhancedStrategyLabView />);
  await waitFor(() => expect(screen.getByText(/MA Cross/i)).toBeInTheDocument());
});
