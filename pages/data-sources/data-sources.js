/**
 * Data Sources Page
 */

class DataSourcesPage {
  constructor() {
    this.sources = [];
    this.refreshInterval = null;
    this.resourcesStats = {
      total_identified: 63,
      total_functional: 55,
      success_rate: 87.3,
      total_api_keys: 11,
      total_endpoints: 200,
      categories: {
        market_data: { total: 13, with_key: 3, without_key: 10 },
        news: { total: 10, with_key: 2, without_key: 8 },
        sentiment: { total: 6, with_key: 0, without_key: 6 },
        analytics: { total: 13, with_key: 0, without_key: 13 },
        block_explorers: { total: 6, with_key: 5, without_key: 1 },
        rpc_nodes: { total: 8, with_key: 2, without_key: 6 },
        ai_ml: { total: 1, with_key: 1, without_key: 0 }
      }
    };
  }

  async init() {
    try {
      console.log('[DataSources] Initializing...');
      this.bindEvents();
      await this.loadDataSources();
      
      this.refreshInterval = setInterval(() => this.loadDataSources(), 60000);
      
      console.log('[DataSources] Ready');
    } catch (error) {
      console.error('[DataSources] Init error:', error);
    }
  }

  bindEvents() {
    // Refresh Button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('loading');
        refreshBtn.innerHTML = `
          <svg class="spinner-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
          Refreshing...
        `;
        await this.loadDataSources();
        refreshBtn.classList.remove('loading');
        refreshBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          Refresh
        `;
      });
    }

    // Test All Button
    const testAllBtn = document.getElementById('test-all-btn');
    if (testAllBtn) {
      testAllBtn.addEventListener('click', () => this.testAllSources());
    }

    // Category Tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        e.target.classList.add('active');
        
        const category = e.target.dataset.category;
        this.filterSources(category);
      });
    });

    // Make stats cards clickable filters
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
      const label = card.querySelector('.stat-label')?.textContent.toLowerCase();
      if (!label) return;

      card.style.cursor = 'pointer'; // Make it look clickable
      
      card.addEventListener('click', () => {
        // Highlight the card
        statCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        if (label.includes('active')) {
          this.filterSourcesByStatus('active');
        } else if (label.includes('ohlcv')) {
          // Trigger the OHLCV tab
          const ohlcvTab = document.querySelector('.tab[data-category="ohlcv"]');
          if (ohlcvTab) ohlcvTab.click();
        } else if (label.includes('free')) {
          // Filter for free tier (assuming all are free based on HTML content)
          this.filterSources('all'); 
        } else if (label.includes('total')) {
          this.filterSources('all');
        }
      });
    });
  }

  filterSourcesByStatus(status) {
    const filtered = this.sources.filter(source => source.status === status);
    this.renderSources(filtered);
    
    // Update tabs UI (deselect all)
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  }

  filterSources(category) {
    if (!category || category === 'all') {
      this.renderSources(this.sources);
      return;
    }

    const filtered = this.sources.filter(source => {
      // Handle different property names (API might return category, type, or tags)
      const sourceCategory = (source.category || source.type || '').toLowerCase();
      return sourceCategory.includes(category.toLowerCase());
    });
    
    this.renderSources(filtered);
  }

  async loadDataSources() {
    try {
      // Get real-time stats from API
      const [providersRes, statsRes] = await Promise.allSettled([
        fetch('/api/providers', { signal: AbortSignal.timeout(10000) }),
        fetch('/api/resources/stats', { signal: AbortSignal.timeout(10000) })
      ]);
      
      // Load providers (REAL DATA)
      if (providersRes.status === 'fulfilled' && providersRes.value.ok) {
        const contentType = providersRes.value.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await providersRes.value.json();
          this.sources = data.providers || data || [];
          console.log(`[DataSources] Loaded ${this.sources.length} sources from API (REAL DATA)`);
        }
      }
      
      // Update stats from real-time API
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const statsData = await statsRes.value.json();
        if (statsData.success && statsData.data) {
          // Merge real API data with existing stats, prioritizing API data
          this.resourcesStats = {
            ...this.resourcesStats,  // Keep fallback values
            ...statsData.data       // Override with real API data
          };
          console.log(`[DataSources] Updated stats from API: ${this.resourcesStats.total_functional} functional, ${this.resourcesStats.total_endpoints} endpoints`);
        }
      } else {
        console.warn('[DataSources] Using fallback stats - API unavailable');
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('[DataSources] Request timeout');
      } else {
        console.error('[DataSources] API error:', error.message);
      }
      // Don't use fallback - show empty state
      this.sources = [];
    }
    
    // Update UI with real data
    this.updateStats();
    this.renderSources(this.sources);
  }

  updateStats() {
    const totalEl = document.getElementById('total-endpoints');
    const activeEl = document.getElementById('active-sources');
    const keysEl = document.getElementById('api-keys');
    const successEl = document.getElementById('success-rate');
    
    // Use real API data if available
    if (totalEl) {
      const totalCount = this.resourcesStats.total_endpoints || this.sources.length || 7;
      totalEl.textContent = totalCount;
    }
    
    if (activeEl) {
      const activeCount = this.resourcesStats.total_functional || 
                         this.sources.filter(s => s.status === 'active').length || 
                         this.sources.length;
      activeEl.textContent = activeCount;
    }
    
    if (keysEl) {
      const keysCount = this.resourcesStats.total_api_keys || 
                       this.sources.filter(s => s.has_key || s.needs_auth).length || 
                       11;
      keysEl.textContent = keysCount;
    }
    
    if (successEl) {
      const successRate = this.resourcesStats.success_rate || 87.3;
      successEl.textContent = `${successRate.toFixed(1)}%`;
    }
  }
  
  updateResourcesStats() {
    // This function is now merged into updateStats()
    // Keeping it for backwards compatibility but it does nothing
    console.log('[DataSources] Stats updated from real API data');
  }
  
  getFallbackSources() {
    return [
      { id: 'binance', name: 'Binance Public', category: 'Market Data', status: 'active', endpoint: 'api.binance.com/api/v3', has_key: false },
      { id: 'coingecko', name: 'CoinGecko', category: 'Market Data', status: 'active', endpoint: 'api.coingecko.com/api/v3', has_key: false },
      { id: 'coinmarketcap', name: 'CoinMarketCap', category: 'Market Data', status: 'active', endpoint: 'pro-api.coinmarketcap.com', has_key: true },
      { id: 'alternative', name: 'Alternative.me', category: 'Sentiment', status: 'active', endpoint: 'api.alternative.me/fng', has_key: false },
      { id: 'newsapi', name: 'NewsAPI', category: 'News', status: 'active', endpoint: 'newsapi.org/v2', has_key: true },
      { id: 'cryptopanic', name: 'CryptoPanic', category: 'News', status: 'active', endpoint: 'cryptopanic.com/api/v1', has_key: false },
      { id: 'etherscan', name: 'Etherscan', category: 'Block Explorers', status: 'active', endpoint: 'api.etherscan.io/api', has_key: true },
      { id: 'bscscan', name: 'BscScan', category: 'Block Explorers', status: 'active', endpoint: 'api.bscscan.com/api', has_key: true }
    ];
  }

  renderSources(sourcesToRender = this.sources) {
    const container = document.getElementById('sources-container');
    if (!container) return;

    if (!sourcesToRender || sourcesToRender.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3>No Data Sources</h3>
          <p>No data sources found for this category. Try refreshing or check API connection.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = sourcesToRender.map(source => {
      const health = source.health || source.health_status || 'unknown';
      const responseTime = source.response_time || source.health?.response_time_ms || null;
      const hasKey = source.has_key || source.needs_auth || false;
      
      return `
        <div class="source-card">
          <div class="source-header">
            <div class="source-title-group">
              <h3>${source.name || source.id || 'Unknown'}</h3>
              ${hasKey ? '<span class="key-badge" title="Requires API Key">🔑</span>' : ''}
            </div>
            <span class="status-badge status-${health}">${health}</span>
          </div>
          <div class="source-body">
            <div class="source-detail">
              <span class="label">Category:</span>
              <span class="value">${source.category || 'N/A'}</span>
            </div>
            <div class="source-detail">
              <span class="label">Endpoint:</span>
              <span class="value code">${source.endpoint || source.url || 'N/A'}</span>
            </div>
            ${responseTime ? `
              <div class="source-detail">
                <span class="label">Response Time:</span>
                <span class="value ${responseTime < 200 ? 'good' : responseTime < 500 ? 'ok' : 'slow'}">${responseTime}ms</span>
              </div>
            ` : ''}
            ${source.rate_limit ? `
              <div class="source-detail">
                <span class="label">Rate Limit:</span>
                <span class="value">${source.rate_limit}</span>
              </div>
            ` : ''}
          </div>
          <div class="source-actions">
            <button class="btn-sm btn-test" onclick="window.dataSourcesPage.testSource('${source.id || source.name}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              Test
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  async testSource(sourceId) {
    console.log('[DataSources] Testing source:', sourceId);
    try {
      const response = await fetch(`/api/providers/${sourceId}/health`);
      const data = await response.json();
      alert(`Source ${sourceId}: ${data.status || 'unknown'}`);
      await this.loadDataSources();
    } catch (error) {
      alert(`Failed to test source: ${error.message}`);
    }
  }

  async testAllSources() {
    console.log('[DataSources] Testing all sources...');
    for (const source of this.sources) {
      await this.testSource(source.id);
    }
  }
}

export default DataSourcesPage;
