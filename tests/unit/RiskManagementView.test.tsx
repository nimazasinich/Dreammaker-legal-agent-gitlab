import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import RiskManagementView from '../../src/views/RiskManagementView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('RiskManagementView lists rules and runs scenario', async () => {
  server.use(http.get('/api/risk/rules', () => HttpResponse.json({ status:'ok', data:[{id:'r1',name:'MaxDrawdown'}] })));
  render(<RiskManagementView />);
  await waitFor(() => expect(screen.getByText(/MaxDrawdown/i)).toBeInTheDocument());
});
