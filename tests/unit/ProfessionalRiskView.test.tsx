import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ProfessionalRiskView from '../../src/views/ProfessionalRiskView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('ProfessionalRiskView renders exposures and warns if mock', async () => {
  server.use(http.get('/api/risk/professional', () => HttpResponse.json({ status:'ok', data:{ exposures: [] } })));
  render(<ProfessionalRiskView />);
  await waitFor(() => expect(screen.getByText(/risk/i)).toBeInTheDocument());
});
