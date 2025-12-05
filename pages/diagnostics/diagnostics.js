/**
 * Diagnostics Page
 */

import { apiClient } from '../../shared/js/core/api-client.js';

class DiagnosticsPage {
  constructor() {
    this.isRunning = false;
    this.requestLog = [];
  }

  async init() {
    console.log('[Diagnostics] Initializing...');
    
    this.bindEvents();
    await this.loadHealthData();
    await this.loadLogs();
    this.startRequestTracking();
  }

  bindEvents() {
    document.getElementById('health-refresh')?.addEventListener('click', () => {
      this.loadHealthData();
    });

    document.getElementById('logs-refresh')?.addEventListener('click', () => {
      this.loadLogs();
    });

    document.getElementById('logs-clear')?.addEventListener('click', () => {
      this.clearLogs();
    });

    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      this.refreshAll();
    });

    document.getElementById('log-type')?.addEventListener('change', () => {
      this.loadLogs();
    });
  }

  /** Load system health data */
  async loadHealthData() {
    const container = document.getElementById('health-grid');
    if (!container) return;

    container.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>';

    try {
      const response = await apiClient.fetch('/api/health');
      const data = await response.json();

      const services = [
        { name: 'Backend Server', status: data.status === 'healthy' ? 'online' : 'offline', key: 'backend' },
        { name: 'CoinMarketCap', status: data.sources?.coinmarketcap || 'unknown', key: 'coinmarketcap' },
        { name: 'NewsAPI', status: data.sources?.newsapi || 'unknown', key: 'newsapi' },
        { name: 'Etherscan', status: data.sources?.etherscan || 'unknown', key: 'etherscan' },
        { name: 'BSCScan', status: data.sources?.bscscan || 'unknown', key: 'bscscan' },
        { name: 'TronScan', status: data.sources?.tronscan || 'unknown', key: 'tronscan' }
      ];

      container.innerHTML = services.map(service => `
        <div class="health-card ${service.status}">
          <div class="health-icon ${service.status}">
            ${this.getStatusIcon(service.status)}
          </div>
          <div class="health-info">
            <h4>${service.name}</h4>
            <span class="status-badge ${service.status}">${service.status}</span>
          </div>
        </div>
      `).join('');

      this.updateLastUpdate();
    } catch (error) {
      console.error('Failed to load health data:', error);
      container.innerHTML = `
        <div class="error-message">
          <p>Failed to load health data: ${error.message}</p>
        </div>
      `;
    }
  }

  /** Load system logs */
  async loadLogs() {
    const container = document.getElementById('logs-container');
    if (!container) return;

    const logType = document.getElementById('log-type')?.value || 'recent';
    const endpoint = logType === 'errors' ? '/api/logs/errors' : '/api/logs/recent';

    container.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>';

    try {
      const response = await apiClient.fetch(endpoint);
      const data = await response.json();
      const logs = data.logs || data.errors || [];

      if (logs.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No logs found</p>';
        return;
      }

      container.innerHTML = `
        <div class="logs-list">
          ${logs.map(log => `
            <div class="log-entry ${log.level?.toLowerCase() || 'info'}">
              <span class="log-time">${log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}</span>
              <span class="log-level ${log.level?.toLowerCase() || 'info'}">${log.level || 'INFO'}</span>
              <span class="log-message">${log.message || log.msg || log.text || ''}</span>
            </div>
          `).join('')}
        </div>
      `;
    } catch (error) {
      console.error('Failed to load logs:', error);
      container.innerHTML = `
        <div class="error-message">
          <p>Failed to load logs: ${error.message}</p>
        </div>
      `;
    }
  }

  /** Clear logs */
  async clearLogs() {
    const container = document.getElementById('logs-container');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-muted">Logs cleared</p>';
  }

  /** Track API requests */
  startRequestTracking() {
    // Intercept apiClient requests
    const originalFetch = apiClient.fetch.bind(apiClient);
    apiClient.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        this.logRequest({
          time: new Date(),
          method: 'GET',
          endpoint: url,
          status: response.status,
          duration
        });
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.logRequest({
          time: new Date(),
          method: 'GET',
          endpoint: url,
          status: 'ERROR',
          duration
        });
        
        throw error;
      }
    };
  }

  /** Log a request */
  logRequest(request) {
    this.requestLog.unshift(request);
    if (this.requestLog.length > 50) {
      this.requestLog = this.requestLog.slice(0, 50);
    }
    this.updateRequestsTable();
  }

  /** Update requests table */
  updateRequestsTable() {
    const tbody = document.getElementById('requests-tbody');
    if (!tbody) return;

    if (this.requestLog.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No requests logged yet</td></tr>';
      return;
    }

    tbody.innerHTML = this.requestLog.map(req => `
      <tr>
        <td>${req.time.toLocaleTimeString()}</td>
        <td><span class="method-badge">${req.method}</span></td>
        <td>${req.endpoint}</td>
        <td><span class="status-badge status-${Math.floor(req.status / 100)}xx">${req.status}</span></td>
        <td>${req.duration}ms</td>
      </tr>
    `).join('');
  }

  /** Refresh all sections */
  async refreshAll() {
    await Promise.all([
      this.loadHealthData(),
      this.loadLogs()
    ]);
  }

  /** Update last update timestamp */
  updateLastUpdate() {
    const elem = document.getElementById('last-update');
    if (elem) {
      elem.textContent = new Date().toLocaleTimeString();
    }
  }

  /** Get status icon SVG */
  getStatusIcon(status) {
    const normalized = status?.toLowerCase();
    if (normalized === 'online' || normalized === 'healthy' || normalized === 'operational') {
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (normalized === 'degraded' || normalized === 'warning') {
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    } else {
      return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    }
  }

}

const diagnosticsPage = new DiagnosticsPage();
diagnosticsPage.init();
