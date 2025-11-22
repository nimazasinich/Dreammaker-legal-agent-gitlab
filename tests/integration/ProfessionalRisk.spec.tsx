import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfessionalRiskView from '../../src/views/ProfessionalRiskView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('ProfessionalRiskView integrates with risk API', async () => {
  server.use(http.get('/api/risk/professional', () => HttpResponse.json({ status:'ok', data:{ exposures:[{symbol:'BTC', value:1000}] } })));
  render(<ProfessionalRiskView />);
  expect(await screen.findByText(/BTC/i)).toBeInTheDocument();
});
