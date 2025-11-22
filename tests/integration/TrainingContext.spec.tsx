import React from 'react';
import { render, screen } from '@testing-library/react';
import TrainingView from '../../src/views/TrainingView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('TrainingView integrates with ML training API', async () => {
  server.use(http.post('/api/ml/train', () => HttpResponse.json({ status:'ok', data:{ jobId:'job1', status:'started' } })));
  render(<TrainingView />);
  expect(await screen.findByText(/job1|started/i)).toBeInTheDocument();
});
