// tests/integration/DataContext.Futures.spec.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { server, setupServerLifecycle, API_PREDICT } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';
import FuturesTradingViewGuarded from '../../src/views/FuturesTradingView.guard';
// If you have a DataProvider that injects contexts, import and wrap here:
// import { DataProvider } from '../../src/contexts/DataContext';

setupServerLifecycle();

test('DataContext supplies predictions to Futures view', async () => {
  server.use(
    http.post(API_PREDICT, () => HttpResponse.json({ status: 'ok', data: { score: 0.88 } }))
  );

  // If DataProvider exists, wrap accordingly:
  render(
    // <DataProvider>
      <FuturesTradingViewGuarded />
    // </DataProvider>
  );

  await waitFor(() => expect(screen.getByTestId('predict-result')).toBeInTheDocument());
  expect(screen.getByTestId('predict-result').textContent).toContain('0.88');
});
