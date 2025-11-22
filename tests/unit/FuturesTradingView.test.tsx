// tests/unit/FuturesTradingView.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FuturesTradingViewGuarded from '../../src/views/FuturesTradingView.guard';
import { server, setupServerLifecycle, API_PREDICT, API_HEALTH } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('renders FuturesTradingView with real data (happy path)', async () => {
  render(<FuturesTradingViewGuarded />);

  // Wait for loading to finish and content to appear
  await waitFor(() => expect(screen.getByText(/Futures Trading/i)).toBeInTheDocument(), { timeout: 5000 });
  await waitFor(() => expect(screen.getByTestId('predict-result')).toBeInTheDocument(), { timeout: 5000 });
  expect(screen.getByTestId('predict-result').textContent).toContain('score');
});

test('shows AI_DATA_TOO_SMALL label when API returns that error', async () => {
  server.use(
    http.post(API_PREDICT, () =>
      HttpResponse.json({ status: 'error', code: 'AI_DATA_TOO_SMALL', message: 'Not enough history' })
    )
  );

  render(<FuturesTradingViewGuarded />);
  await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  expect(screen.getByRole('alert').textContent).toContain('AI_DATA_TOO_SMALL');
});
