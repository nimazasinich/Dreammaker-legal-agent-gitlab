/**
 * API Explorer Page
 */

class APIExplorerPage {
  constructor() {
    this.currentMethod = 'GET';
    this.history = [];
  }

  async init() {
    try {
      console.log('[APIExplorer] Initializing...');
      this.bindEvents();
      this.loadHistory();
      await this.loadProviders();
      console.log('[APIExplorer] Ready');
    } catch (error) {
      console.error('[APIExplorer] Init error:', error);
    }
  }

  bindEvents() {
    const sendBtn = document.getElementById('send-btn');
    const methodSelect = document.getElementById('method-select');
    const endpointSelect = document.getElementById('endpoint-select');
    const bodyGroup = document.getElementById('body-group');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.sendRequest());
    }

    if (methodSelect) {
      methodSelect.addEventListener('change', (e) => {
        this.currentMethod = e.target.value;
        this.toggleBodyField();
      });
    }

    if (endpointSelect) {
      endpointSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.selectedOptions[0];
        const dataMethod = selectedOption.getAttribute('data-method');
        if (dataMethod) {
          this.currentMethod = dataMethod;
          methodSelect.value = dataMethod;
          this.toggleBodyField();
        }
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyResponse());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearResponse());
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }

    this.toggleBodyField();
  }

  toggleBodyField() {
    const bodyGroup = document.getElementById('body-group');
    if (bodyGroup) {
      bodyGroup.style.display = (this.currentMethod === 'POST' || this.currentMethod === 'PUT') ? 'block' : 'none';
    }
  }

  async sendRequest() {
    const endpointSelect = document.getElementById('endpoint-select');
    const bodyInput = document.getElementById('request-body');
    const responseContent = document.getElementById('response-content');
    const responseStatus = document.getElementById('response-status');
    const responseTime = document.getElementById('response-time');

    if (!endpointSelect || !responseContent) return;

    const endpoint = endpointSelect.value;
    if (!endpoint) {
      responseContent.textContent = JSON.stringify({ error: 'Please select an endpoint' }, null, 2);
      return;
    }

    const url = window.location.origin + endpoint;
    
    // Show loading state with spinner
    responseContent.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div class="spinner" style="display: inline-block; width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid var(--color-primary, #3b82f6); border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 1rem; color: var(--text-muted, #6b7280);">Sending request...</p>
      </div>
    `;
    responseStatus.textContent = 'Loading...';
    responseStatus.className = 'status status-loading';
    responseTime.textContent = '';

    const startTime = performance.now();
    
    // Disable send button during request
    const sendBtn = document.getElementById('send-btn');
    const originalBtnText = sendBtn?.textContent;
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';
    }

    try {
      const options = { 
        method: this.currentMethod,
        headers: {}
      };

      if ((this.currentMethod === 'POST' || this.currentMethod === 'PUT') && bodyInput && bodyInput.value.trim()) {
        try {
          JSON.parse(bodyInput.value);
          options.body = bodyInput.value;
          options.headers['Content-Type'] = 'application/json';
        } catch (e) {
          responseContent.textContent = JSON.stringify({ error: 'Invalid JSON in request body' }, null, 2);
          responseStatus.textContent = 'Error';
          responseStatus.className = 'status status-error';
          return;
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, { 
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      responseTime.textContent = `${duration}ms`;
      responseStatus.textContent = `${response.status} ${response.statusText}`;
      responseStatus.className = `status ${response.ok ? 'status-success' : 'status-error'}`;

      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        responseContent.textContent = JSON.stringify(data, null, 2);
      } else {
        const text = await response.text();
        responseContent.textContent = text;
      }

      this.addToHistory({
        method: this.currentMethod,
        endpoint,
        status: response.status,
        duration,
        timestamp: new Date().toISOString()
      });
      
      // Re-enable send button
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = originalBtnText;
      }
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      responseTime.textContent = `${duration}ms`;
      responseStatus.textContent = 'Error';
      responseStatus.className = 'status status-error';

      let errorMessage;
      if (error.name === 'AbortError') {
        errorMessage = { 
          error: 'Request timeout (30s)',
          suggestion: 'The request took too long. Try a different endpoint or check your connection.'
        };
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = { 
          error: 'Network error',
          message: error.message,
          suggestion: 'Check your internet connection and CORS settings. The endpoint might not be accessible.'
        };
      } else {
        errorMessage = { 
          error: error.message,
          suggestion: 'This might be due to CORS policy, network issues, or an invalid endpoint.'
        };
      }
      
      responseContent.textContent = JSON.stringify(errorMessage, null, 2);
      
      // Re-enable send button
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.textContent = originalBtnText;
      }
    }
  }

  copyResponse() {
    const responseContent = document.getElementById('response-content');
    if (responseContent) {
      navigator.clipboard.writeText(responseContent.textContent)
        .then(() => this.showToast('Response copied to clipboard'))
        .catch(() => this.showToast('Failed to copy', 'error'));
    }
  }

  clearResponse() {
    const responseContent = document.getElementById('response-content');
    const responseStatus = document.getElementById('response-status');
    const responseTime = document.getElementById('response-time');

    if (responseContent) {
      responseContent.textContent = JSON.stringify({ message: 'Select an endpoint and click \'Send Request\'' }, null, 2);
    }
    if (responseStatus) {
      responseStatus.textContent = '--';
      responseStatus.className = 'status';
    }
    if (responseTime) {
      responseTime.textContent = '--';
    }
  }

  addToHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > 10) {
      this.history.pop();
    }
    this.saveHistory();
    this.renderHistory();
  }

  saveHistory() {
    try {
      localStorage.setItem('api-explorer-history', JSON.stringify(this.history));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('api-explorer-history');
      if (saved) {
        this.history = JSON.parse(saved);
        this.renderHistory();
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }

  renderHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    if (this.history.length === 0) {
      historyList.innerHTML = '<div class="empty-state">No requests yet</div>';
      return;
    }

    historyList.innerHTML = this.history.map(entry => `
      <div class="history-item">
        <div class="history-method method-${entry.method.toLowerCase()}">${entry.method}</div>
        <div class="history-endpoint">${entry.endpoint}</div>
        <div class="history-status status-${entry.status < 400 ? 'success' : 'error'}">${entry.status}</div>
        <div class="history-time">${entry.duration}ms</div>
      </div>
    `).join('');
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
    this.renderHistory();
    this.showToast('History cleared');
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Load and display available providers
   */
  async loadProviders() {
    const grid = document.getElementById('providers-grid');
    const countBadge = document.getElementById('providers-count');
    
    if (!grid) return;

    try {
      const response = await fetch(`${window.location.origin}/api/providers`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load providers');
      }

      const providers = data.providers || [];
      
      if (countBadge) {
        countBadge.textContent = data.total || providers.length;
      }

      this.renderProviders(providers);
    } catch (error) {
      console.error('[APIExplorer] Error loading providers:', error);
      grid.innerHTML = `<div class="empty-state error">Failed to load providers: ${error.message}</div>`;
      if (countBadge) {
        countBadge.textContent = '0';
      }
    }
  }

  /**
   * Render providers grid
   */
  renderProviders(providers) {
    const grid = document.getElementById('providers-grid');
    if (!grid) return;

    if (providers.length === 0) {
      grid.innerHTML = '<div class="empty-state">No providers available</div>';
      return;
    }

    grid.innerHTML = providers.map(provider => {
      const statusClass = this.getProviderStatusClass(provider.status);
      const hasApiKey = provider.has_api_key || provider.has_api_token;
      const authBadge = hasApiKey
        ? '<span class="badge badge-warning">API Key</span>'
        : '<span class="badge badge-success">No Auth</span>';

      // Build capabilities list
      const capabilities = provider.capabilities || [];
      const capabilitiesHtml = capabilities.length > 0
        ? `<div class="provider-capabilities">
             ${capabilities.map(cap => `<span class="capability-tag">${this.escapeHtml(cap)}</span>`).join('')}
           </div>`
        : '';

      return `
        <div class="provider-card">
          <div class="provider-header">
            <div class="provider-info">
              <h4 class="provider-name">${this.escapeHtml(provider.name)}</h4>
              <span class="badge badge-category">${this.escapeHtml(provider.category)}</span>
            </div>
            <div class="provider-badges">
              ${authBadge}
            </div>
          </div>
          <div class="provider-body">
            ${provider.endpoint || provider.base_url ? `<div class="provider-url">${this.escapeHtml(provider.endpoint || provider.base_url)}</div>` : ''}
            ${capabilitiesHtml}
            ${provider.status ? `<div class="provider-status ${statusClass}">${this.escapeHtml(provider.status)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Get CSS class for provider status
   */
  getProviderStatusClass(status) {
    if (!status) return 'status-unknown';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('valid') || statusLower === 'available' || statusLower === 'online') {
      return 'status-success';
    }
    if (statusLower.includes('invalid') || statusLower === 'offline') {
      return 'status-error';
    }
    if (statusLower.includes('conditional') || statusLower === 'degraded') {
      return 'status-warning';
    }
    return 'status-unknown';
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default APIExplorerPage;
