import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import TrainingView from '../../src/views/TrainingView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('TrainingView shows ML training interface and model status', async () => {
  server.use(http.get('/api/ml/training', () => HttpResponse.json({ status:'ok', data:{ models:[{name:'model1',status:'trained'}] } })));
  render(<TrainingView />);
  await waitFor(() => expect(screen.getByText(/model1|trained/i)).toBeInTheDocument());
});
