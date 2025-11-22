import React from 'react';
import { render, screen } from '@testing-library/react';
import RiskManagementView from '../../src/views/RiskManagementView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('RiskManagement integrates with rules API', async () => {
  server.use(http.get('/api/risk/rules', () => HttpResponse.json({ status:'ok', data:[{id:'r1'}] })));
  render(<RiskManagementView />);
  expect(await screen.findByText(/r1/i)).toBeInTheDocument();
});
