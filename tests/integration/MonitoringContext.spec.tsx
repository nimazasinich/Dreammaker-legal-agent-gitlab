import React from 'react';
import { render, screen } from '@testing-library/react';
import MonitoringView from '../../src/views/MonitoringView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('MonitoringView interacts with alert API', async () => {
  server.use(http.post('/api/monitor/ack', () => HttpResponse.json({ status:'ok', data:{ ack:true } })));
  render(<MonitoringView />);
  expect(await screen.findByText(/ack/i)).toBeDefined();
});
