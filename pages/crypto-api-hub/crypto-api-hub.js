/**
 * Crypto API Hub Page
 */

import { formatNumber } from '../../shared/js/utils/formatters.js';
import logger from '../../shared/js/utils/logger.js';

class CryptoAPIHubPage {
    constructor() {
        this.currentFilter = 'all';
        this.apis = [];
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (typeof text !== 'string') {
            return String(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async init() {
        try {
            logger.info('CryptoAPIHub', 'Initializing...');

            this.bindEvents();
            await this.loadAPIs();

            logger.info('CryptoAPIHub', 'Ready');
        } catch (error) {
            logger.error('CryptoAPIHub', 'Init error:', error);
        }
    }

    /**
     * Bind event listeners to UI elements
     */
    bindEvents() {
        logger.debug('CryptoAPIHub', 'Binding events...');

        // Search functionality
        const searchInput = document.getElementById('api-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterAPIs(e.target.value);
            });
            logger.debug('CryptoAPIHub', 'Search input bound');
        } else {
            logger.warn('CryptoAPIHub', 'Search input #api-search not found');
        }

        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        if (filterButtons.length > 0) {
            filterButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    filterButtons.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    this.currentFilter = e.target.dataset.filter;
                    logger.debug('CryptoAPIHub', `Filter changed to: ${this.currentFilter}`);
                    this.renderAPIs();
                });
            });
            logger.debug('CryptoAPIHub', `Bound ${filterButtons.length} filter buttons`);
        } else {
            logger.warn('CryptoAPIHub', 'No filter buttons (.filter-btn) found');
        }

        // API Tester Button
        const testerBtn = document.getElementById('api-tester-btn');
        if (testerBtn) {
            testerBtn.addEventListener('click', () => {
                logger.debug('CryptoAPIHub', 'Opening API tester modal');
                this.openTesterModal();
            });
            logger.debug('CryptoAPIHub', 'API tester button bound');
        } else {
            logger.warn('CryptoAPIHub', 'API tester button #api-tester-btn not found');
        }

        // Export Button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                logger.debug('CryptoAPIHub', 'Exporting APIs');
                this.exportAPIs();
            });
            logger.debug('CryptoAPIHub', 'Export button bound');
        } else {
            logger.warn('CryptoAPIHub', 'Export button #export-btn not found');
        }

        // Modal Close Buttons
        const closeBtn = document.getElementById('modal-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeTesterModal());
            logger.debug('CryptoAPIHub', 'Modal close button bound');
        }

        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                // Only close if clicking the overlay itself, not its children
                if (e.target === modalOverlay) {
                    this.closeTesterModal();
                }
            });
            logger.debug('CryptoAPIHub', 'Modal overlay bound');
        }

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('api-tester-modal');
                if (modal && modal.classList.contains('active')) {
                    this.closeTesterModal();
                }
            }
        });

        // Modal Tester Logic
        const sendRequestBtn = document.getElementById('send-request-btn');
        if (sendRequestBtn) {
            sendRequestBtn.addEventListener('click', () => this.sendTestRequest());
            logger.debug('CryptoAPIHub', 'Send request button bound');
        }

        // HTTP Method buttons
        const methodButtons = document.querySelectorAll('.method-btn');
        if (methodButtons.length > 0) {
            methodButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    methodButtons.forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    // Show/hide body input based on method
                    const method = e.target.dataset.method;
                    const bodyGroup = document.getElementById('body-group');
                    if (bodyGroup) {
                        bodyGroup.style.display = (method === 'POST' || method === 'PUT') ? 'block' : 'none';
                    }
                });
            });
            logger.debug('CryptoAPIHub', `Bound ${methodButtons.length} method buttons`);
        }

        logger.debug('CryptoAPIHub', 'Event binding complete');
    }

    openTesterModal(apiId = null) {
        const modal = document.getElementById('api-tester-modal');
        if (modal) {
            modal.classList.add('active');
            if (apiId) {
                const api = this.apis.find(a => a.id === apiId);
                if (api) {
                    const urlInput = document.getElementById('test-url');
                    if (urlInput) urlInput.value = api.base_url || api.url || '';
                }
            }
        }
    }

    /**
     * Close the API tester modal
     */
    closeTesterModal() {
        const modal = document.getElementById('api-tester-modal');
        if (modal) {
            modal.classList.remove('active');
            logger.debug('CryptoAPIHub', 'Modal closed');
        }
    }

    exportAPIs() {
        if (!Array.isArray(this.apis) || this.apis.length === 0) {
            alert('No APIs to export');
            return;
        }

        const dataStr = JSON.stringify(this.apis, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = 'crypto-apis-export.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    async sendTestRequest() {
        const url = document.getElementById('test-url')?.value;
        const method = document.querySelector('.method-btn.active')?.dataset.method || 'GET';
        const headersStr = document.getElementById('test-headers')?.value;
        const bodyStr = document.getElementById('test-body')?.value;
        const responseContainer = document.getElementById('response-container');
        const responseJson = document.getElementById('response-json');

        if (!url) {
            alert('Please enter a URL');
            return;
        }

        if (responseContainer) responseContainer.style.display = 'block';
        if (responseJson) responseJson.textContent = 'Loading...';

        try {
            let headers = {};
            if (headersStr) {
                try {
                    headers = JSON.parse(headersStr);
                } catch (e) {
                    alert('Invalid JSON in headers');
                    return;
                }
            }

            let body = undefined;
            if ((method === 'POST' || method === 'PUT') && bodyStr) {
                try {
                    body = JSON.parse(bodyStr);
                } catch (e) {
                    alert('Invalid JSON in body');
                    return;
                }
            }

            // Use the proxy endpoint if needed, or direct fetch if CORS allows.
            // Using direct fetch for now as user instructions imply client-side testing, 
            // but usually we need a backend proxy to avoid CORS.
            // There is a /api/crypto-hub/test endpoint in the other JS file, 
            // but here we might use a simple fetch first.

            // Note: For the fix, we'll use direct fetch but catch errors.

            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const res = await fetch(url, options);
            const data = await res.json().catch(() => ({ status: res.status, statusText: res.statusText }));

            if (responseJson) {
                responseJson.textContent = JSON.stringify(data, null, 2);
            }

        } catch (error) {
            if (responseJson) {
                responseJson.textContent = 'Error: ' + error.message;
            }
        }
    }

    /**
     * Load APIs from backend with retry logic
     * @param {number} retryCount - Current retry attempt (internal use)
     * @param {number} maxRetries - Maximum number of retries
     * @returns {Promise<void>}
     */
    async loadAPIs(retryCount = 0, maxRetries = 2) {
        const container = document.getElementById('apis-container');
        let errorMessage = 'Failed to load APIs';
        
        // Show loading state
        if (container && retryCount === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <p style="margin-top: 1rem; color: var(--text-secondary, #6b7280);">Loading APIs...</p>
                </div>
            `;
        }
        
        try {
            logger.debug('CryptoAPIHub', `Loading APIs from /api/resources/apis... (attempt ${retryCount + 1}/${maxRetries + 1})`);
            
            // Use dynamic base URL for Hugging Face deployment
            const baseUrl = window.location.origin;
            const apiUrl = `${baseUrl}/api/resources/apis`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            let response;
            try {
                response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                });
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Request timeout: Server took too long to respond');
                }
                throw fetchError;
            } finally {
                clearTimeout(timeoutId);
            }

            // Log response details for debugging
            logger.debug('CryptoAPIHub', 'Response status:', response.status, response.statusText);
            logger.debug('CryptoAPIHub', 'Response headers:', Object.fromEntries(response.headers.entries()));

            // Check if response is OK
            if (!response.ok) {
                // Try to extract error message from JSON response
                let errorData = null;
                const contentType = response.headers.get('content-type') || '';
                
                if (contentType.includes('application/json')) {
                    try {
                        const responseText = await response.text();
                        if (responseText && responseText.trim().length > 0) {
                            errorData = JSON.parse(responseText);
                            errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
                        } else {
                            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                        }
                    } catch (parseError) {
                        logger.warn('CryptoAPIHub', 'Failed to parse error response as JSON:', parseError);
                        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    }
                } else {
                    // Try to get text error
                    try {
                        const errorText = await response.text();
                        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
                    } catch (textError) {
                        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                    }
                }
                
                // Log full error details for debugging
                logger.error('CryptoAPIHub', 'API request failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorMessage: errorMessage,
                    errorData: errorData,
                    url: apiUrl,
                    timestamp: new Date().toISOString()
                });
                
                // Retry on 500 errors if we haven't exceeded max retries
                if (response.status === 500 && retryCount < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
                    logger.info('CryptoAPIHub', `Retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                    
                    if (container) {
                        container.innerHTML = `
                            <div style="text-align: center; padding: 2rem;">
                                <p style="color: var(--text-secondary, #6b7280);">Server error. Retrying...</p>
                            </div>
                        `;
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.loadAPIs(retryCount + 1, maxRetries);
                }
                
                throw new Error(errorMessage);
            }

            // Validate content type
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                logger.warn('CryptoAPIHub', 'Unexpected content type:', contentType);
                // Still try to parse as JSON if possible
            }

            // Parse JSON response
            let data;
            try {
                const responseText = await response.text();
                if (!responseText || responseText.trim().length === 0) {
                    throw new Error('Empty response from server');
                }
                data = JSON.parse(responseText);
            } catch (parseError) {
                logger.error('CryptoAPIHub', 'JSON parse error:', parseError);
                throw new Error(`Invalid JSON response: ${parseError.message}`);
            }

            // Validate data structure
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response: expected object, got ' + typeof data);
            }

            // Check for error flag in response
            if (data.error === true || data.ok === false) {
                errorMessage = data.message || 'API returned an error';
                throw new Error(errorMessage);
            }

            logger.debug('CryptoAPIHub', 'Received data:', data);

            // Handle various data structures from different endpoints
            let apiList = [];
            if (Array.isArray(data)) {
                apiList = data;
            } else if (Array.isArray(data.apis)) {
                // Standard format with all APIs: { apis: [...] }
                apiList = data.apis;
                logger.debug('CryptoAPIHub', `Loaded ${apiList.length} APIs from data.apis`);
            } else if (data.local_routes && Array.isArray(data.local_routes.routes)) {
                // Legacy format - local routes only
                apiList = data.local_routes.routes.map(route => ({
                    id: route.path || route.name,
                    name: route.name || route.path,
                    category: route.category || 'local',
                    description: route.description || route.summary || '',
                    endpoints: route.endpoints_count || 1,
                    endpoints_count: route.endpoints_count || 1,
                    requires_key: route.requires_auth || false,
                    free: !route.requires_auth,
                    url: route.path || '',
                    base_url: route.path || ''
                }));
            } else if (data.providers && Array.isArray(data.providers)) {
                // Providers format
                apiList = data.providers;
            } else {
                logger.warn('CryptoAPIHub', 'Unexpected data format, trying to extract:', data);
                // Try to find any array in the response
                for (const key in data) {
                    if (Array.isArray(data[key]) && data[key].length > 0) {
                        logger.debug('CryptoAPIHub', `Found array at key: ${key}`);
                        apiList = data[key];
                        break;
                    }
                }
            }

            // Validate apiList is an array
            if (!Array.isArray(apiList)) {
                logger.warn('CryptoAPIHub', 'apiList is not an array, defaulting to empty:', typeof apiList);
                apiList = [];
            }

            // Normalize the API list to ensure consistent structure
            this.apis = apiList.map(api => {
                // Validate each API item
                if (!api || typeof api !== 'object') {
                    logger.warn('CryptoAPIHub', 'Invalid API item, skipping:', api);
                    return null;
                }
                
                return {
                    id: String(api.id || api.name || api.path || ''),
                    name: String(api.name || api.title || api.path || 'Unknown'),
                    category: String(api.category || 'general'),
                    description: String(api.description || api.summary || ''),
                    endpoints: Number(api.endpoints || api.endpoints_count || 0) || 0,
                    endpoints_count: Number(api.endpoints_count || api.endpoints || 0) || 0,
                    requires_key: Boolean(api.requires_key || api.requires_auth || false),
                    free: api.free !== undefined ? Boolean(api.free) : !Boolean(api.requires_key || api.requires_auth),
                    url: String(api.url || api.base_url || api.path || ''),
                    base_url: String(api.base_url || api.url || api.path || ''),
                    status: String(api.status || 'unknown')
                };
            }).filter(api => api !== null); // Remove null entries

            logger.info('CryptoAPIHub', `Loaded ${this.apis.length} APIs`);
            this.renderAPIs();
            this.updateStats();
            
        } catch (error) {
            // Log full error details for debugging
            const errorDetails = {
                message: error.message,
                name: error.name,
                stack: error.stack,
                endpoint: '/api/resources/apis',
                retryCount: retryCount,
                maxRetries: maxRetries,
                timestamp: new Date().toISOString()
            };
            
            logger.error('CryptoAPIHub', 'Load error:', error);
            console.error('[CryptoAPIHub] Failed to load APIs:', errorDetails);
            
            // Determine user-friendly error message
            if (error.name === 'AbortError' || error.message.includes('timeout')) {
                errorMessage = 'Request timed out. The server took too long to respond. Please check your connection and try again.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('network')) {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
                errorMessage = 'Server error. The server encountered an internal error. Please try again in a moment.';
            } else if (error.message.includes('404')) {
                errorMessage = 'API endpoint not found. Please contact support if this problem persists.';
            } else {
                errorMessage = error.message || 'Unknown error occurred while loading APIs.';
            }
            
            // Retry on network errors if we haven't exceeded max retries
            if ((error.name === 'AbortError' || error.message.includes('timeout') || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) 
                && retryCount < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
                logger.info('CryptoAPIHub', `Retrying after network error in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                
                if (container) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 2rem;">
                            <p style="color: var(--text-secondary, #6b7280);">Connection issue. Retrying...</p>
                        </div>
                    `;
                }
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.loadAPIs(retryCount + 1, maxRetries);
            }
            
            // Show user-friendly error message with retry option
            if (container) {
                container.innerHTML = `
                    <div class="error-state" style="text-align: center; padding: 2rem; color: var(--error, #ef4444);">
                        <h3 style="margin-bottom: 1rem;">⚠️ Failed to load APIs</h3>
                        <p style="margin: 1rem 0; font-size: 1rem;">${this.escapeHtml(errorMessage)}</p>
                        <p style="font-size: 0.875rem; color: var(--text-secondary, #6b7280); margin-top: 0.5rem;">
                            If this problem persists, please check the browser console for details.
                        </p>
                        <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem; justify-content: center;">
                            <button onclick="window.cryptoAPIHubPage.loadAPIs()" 
                                    style="padding: 0.75rem 1.5rem; background: var(--accent-primary, #3b82f6); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.875rem; font-weight: 500;">
                                🔄 Retry
                            </button>
                            <button onclick="window.location.reload()" 
                                    style="padding: 0.75rem 1.5rem; background: var(--bg-secondary, #f3f4f6); color: var(--text-primary, #111827); border: 1px solid var(--border, #d1d5db); border-radius: 4px; cursor: pointer; font-size: 0.875rem;">
                                🔃 Reload Page
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Reset state to prevent undefined errors
            this.apis = [];
            this.renderAPIs();
            this.updateStats();
        }
    }

    renderAPIs() {
        const container = document.getElementById('apis-container');
        if (!container) {
            logger.warn('CryptoAPIHub', 'Container #apis-container not found');
            return;
        }

        // Ensure this.apis is an array
        if (!Array.isArray(this.apis)) {
            logger.warn('CryptoAPIHub', 'this.apis is not an array, resetting to empty array');
            this.apis = [];
        }

        let filtered = this.apis;
        if (this.currentFilter !== 'all') {
            // Additional safety check
            if (typeof this.apis.filter === 'function') {
                filtered = this.apis.filter(api => api.category === this.currentFilter);
            } else {
                filtered = [];
            }
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No APIs found</div>';
            return;
        }

        container.innerHTML = filtered.map(api => `
      <div class="api-card" style="background: var(--bg-secondary); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid var(--border-color);">
        <div class="api-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3 style="margin: 0; color: var(--text-primary);">${api.name || api.title || 'Unknown API'}</h3>
          <span class="api-category" style="padding: 0.25rem 0.75rem; background: var(--accent-primary); color: white; border-radius: 4px; font-size: 0.875rem;">${api.category || 'General'}</span>
        </div>
        <div class="api-body">
          <p class="api-description" style="color: var(--text-secondary); margin-bottom: 1rem;">${api.description || 'No description available'}</p>
          <div class="api-meta" style="display: flex; gap: 1rem; margin-bottom: 1rem;">
            <span class="meta-item" style="color: var(--text-secondary);">
              <strong>Endpoints:</strong> ${api.endpoints_count || api.endpoints || 0}
            </span>
            <span class="meta-item ${(api.requires_key || !api.free) ? 'requires-key' : 'free'}" style="color: ${(api.requires_key || !api.free) ? 'var(--warning)' : 'var(--success)'};">
              ${(api.requires_key || !api.free) ? '🔑 Requires Key' : '✅ Free'}
            </span>
          </div>
        </div>
        <div class="api-actions" style="display: flex; gap: 0.5rem;">
          <button class="btn-sm" onclick="window.cryptoAPIHubPage.viewAPI('${api.id}')" style="padding: 0.5rem 1rem; background: var(--accent-primary); color: white; border: none; border-radius: 4px; cursor: pointer;">View</button>
          <button class="btn-sm" onclick="window.cryptoAPIHubPage.testAPI('${api.id}')" style="padding: 0.5rem 1rem; background: var(--accent-secondary); color: white; border: none; border-radius: 4px; cursor: pointer;">Test</button>
        </div>
      </div>
    `).join('');
    }

    filterAPIs(query) {
        const cards = document.querySelectorAll('.api-card');
        const lowerQuery = query.toLowerCase();

        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(lowerQuery) ? 'block' : 'none';
        });
    }

    /**
     * Update statistics display
     */
    updateStats() {
        if (!Array.isArray(this.apis)) {
            logger.warn('CryptoAPIHub', 'this.apis is not an array in updateStats');
            this.apis = [];
        }

        const totalAPIs = this.apis.length;
        const freeAPIs = this.apis.filter(api => api.free || !api.requires_key).length;
        const categories = [...new Set(this.apis.map(api => api.category).filter(Boolean))].length;
        const totalEndpoints = this.apis.reduce((sum, api) => sum + (api.endpoints_count || api.endpoints || 0), 0);

        // Update total services
        const totalEl = document.getElementById('total-services');
        if (totalEl) totalEl.textContent = totalAPIs;

        // Update total endpoints
        const endpointsEl = document.getElementById('total-endpoints');
        if (endpointsEl) endpointsEl.textContent = totalEndpoints > 0 ? totalEndpoints : '150+';

        // Update categories (if element exists)
        const catEl = document.getElementById('categories-count');
        if (catEl) catEl.textContent = categories;

        logger.debug('CryptoAPIHub', `Stats updated: ${totalAPIs} APIs, ${freeAPIs} free, ${categories} categories`);
    }

    /**
     * View API details
     * @param {string} apiId - API identifier
     */
    viewAPI(apiId) {
        const api = this.apis.find(a => a.id === apiId);
        if (api) {
            const details = `
API: ${api.name}
Category: ${api.category}
Endpoints: ${api.endpoints_count || api.endpoints || 0}
${api.url ? 'URL: ' + api.url : ''}
Status: ${api.status || 'Unknown'}
Auth Required: ${api.requires_key ? 'Yes' : 'No'}
Description: ${api.description || 'N/A'}
      `.trim();
            alert(details);
        } else {
            logger.warn('CryptoAPIHub', `API not found: ${apiId}`);
        }
    }

    /**
     * Test API using the modal
     * @param {string} apiId - API identifier
     */
    testAPI(apiId) {
        // Use the internal modal instead of navigating away
        this.openTesterModal(apiId);
    }
}

export default CryptoAPIHubPage;
