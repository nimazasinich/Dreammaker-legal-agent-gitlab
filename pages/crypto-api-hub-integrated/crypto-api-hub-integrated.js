/**
 * Crypto API Hub Integrated Page
 */

class CryptoApiHubIntegratedPage {
  constructor() {
    this.services = [];
    this.currentCategory = 'all';
  }

  async init() {
    try {
      console.log('[CryptoAPIHubIntegrated] Initializing...');
      
      this.bindEvents();
      await this.loadServices();
      
      console.log('[CryptoAPIHubIntegrated] Ready');
    } catch (error) {
      console.error('[CryptoAPIHubIntegrated] Init error:', error);
    }
  }

  bindEvents() {
    const searchInput = document.getElementById('search-services');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterServices(e.target.value);
      });
    }

    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        categoryButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentCategory = e.target.dataset.category;
        this.renderServices();
      });
    });

    const exportBtn = document.getElementById('export-apis-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportAPIs());
    }
  }

  async loadServices() {
    try {
      const response = await fetch('/api/resources/apis', {
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const data = await response.json();
        this.services = data.apis || data || [];
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('[CryptoAPIHubIntegrated] Request timeout, using fallback');
      } else {
        console.error('[CryptoAPIHubIntegrated] Load error:', error);
      }
      this.services = this.getMockServices();
    }
    
    this.renderServices();
    this.updateStats();
  }
  
  updateStats() {
    const stats = {
      total: 55,
      functional: 55,
      api_keys: 11,
      endpoints: 200,
      success_rate: 87.3
    };
    
    const statsEl = document.getElementById('api-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Total Resources:</span>
            <span class="stat-value">${stats.total}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Functional:</span>
            <span class="stat-value">${stats.functional}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">API Keys:</span>
            <span class="stat-value">${stats.api_keys}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Endpoints:</span>
            <span class="stat-value">${stats.endpoints}+</span>
          </div>
        </div>
      `;
    }
  }

  getMockServices() {
    return [
      {
        id: 'coingecko',
        name: 'CoinGecko',
        category: 'market',
        description: 'Free cryptocurrency data API',
        endpoints_count: 50,
        requires_key: false,
        status: 'active'
      },
      {
        id: 'coinmarketcap',
        name: 'CoinMarketCap',
        category: 'market',
        description: 'Cryptocurrency market data',
        endpoints_count: 30,
        requires_key: true,
        status: 'active'
      },
      {
        id: 'etherscan',
        name: 'Etherscan',
        category: 'explorer',
        description: 'Ethereum blockchain explorer API',
        endpoints_count: 40,
        requires_key: true,
        status: 'active'
      }
    ];
  }

  renderServices() {
    const container = document.getElementById('services-grid');
    if (!container) return;

    let filtered = this.services;
    if (this.currentCategory !== 'all') {
      filtered = this.services.filter(s => s.category === this.currentCategory);
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state">No services found</div>';
      return;
    }

    container.innerHTML = filtered.map(service => `
      <div class="service-card" data-category="${service.category}">
        <div class="service-icon">${this.getCategoryIcon(service.category)}</div>
        <div class="service-header">
          <h3>${service.name}</h3>
          <span class="status-badge ${service.status}">${service.status || 'active'}</span>
        </div>
        <div class="service-body">
          <p>${service.description}</p>
          <div class="service-meta">
            <span class="meta-tag">${service.endpoints_count || 0} endpoints</span>
            <span class="meta-tag ${service.requires_key ? 'key-required' : 'free'}">
              ${service.requires_key ? '🔑 Key Required' : '✅ Free'}
            </span>
          </div>
        </div>
        <div class="service-actions">
          <button class="btn-action" onclick="window.cryptoApiHubIntegratedPage.viewService('${service.id}')">
            View Docs
          </button>
          <button class="btn-action" onclick="window.cryptoApiHubIntegratedPage.testService('${service.id}')">
            Test API
          </button>
        </div>
      </div>
    `).join('');
  }

  getCategoryIcon(category) {
    const icons = {
      'market': '📊',
      'explorer': '🔍',
      'news': '📰',
      'sentiment': '💭',
      'analytics': '📈',
      'defi': '💰'
    };
    return icons[category] || '🔧';
  }

  filterServices(query) {
    const cards = document.querySelectorAll('.service-card');
    const lowerQuery = query.toLowerCase();

    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(lowerQuery) ? 'block' : 'none';
    });
  }

  updateStats() {
    const stats = {
      total: this.services.length,
      free: this.services.filter(s => !s.requires_key).length,
      categories: [...new Set(this.services.map(s => s.category))].length
    };

    const statsElements = {
      'total-services': stats.total,
      'free-services': stats.free,
      'total-categories': stats.categories
    };

    Object.entries(statsElements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  }

  viewService(serviceId) {
    const service = this.services.find(s => s.id === serviceId);
    if (service) {
      window.open(`/static/pages/api-explorer/index.html?service=${serviceId}`, '_blank');
    }
  }

  testService(serviceId) {
    window.location.href = `/static/pages/api-explorer/index.html?service=${serviceId}`;
  }

  exportAPIs() {
    const dataStr = JSON.stringify(this.services, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'crypto-apis-export.json';
    link.click();
    
    URL.revokeObjectURL(url);
  }
}

export default CryptoApiHubIntegratedPage;

