import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MonitoringView from '../../src/views/MonitoringView';
import { server, setupServerLifecycle } from '../setup/mswServer';
import { http, HttpResponse } from 'msw';

setupServerLifecycle();

test('MonitoringView lists alerts and can acknowledge', async () => {
  server.use(http.get('/api/monitor/alerts', () => HttpResponse.json({ status:'ok', data:[{id:'a1',title:'High CPU'}] })));
  render(<MonitoringView />);
  await waitFor(() => expect(screen.getByText(/High CPU/i)).toBeInTheDocument());
});
