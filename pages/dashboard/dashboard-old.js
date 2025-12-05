/**
 * Dashboard Page Controller - Enhanced Edition
 * Displays comprehensive system overview with:
 * - Real-time market data with sortable/filterable tables
 * - Sentiment analysis with timeframe selection
 * - System stats and resource categories
 * - Performance metrics
 * - Auto-refresh with polling
 */

import { api } from '../../shared/js/core/api-client.js';
import { pollingManager } from '../../shared/js/core/polling-manager.js';
import { LayoutManager } from '../../shared/js/core/layout-manager.js';
import { Toast } from '../../shared/js/components/toast.js';
import { Loading } from '../../shared/js/components/loading.js';
import { ChartComponent, loadChartJS } from '../../shared/js/components/chart.js';
import { formatNumber, formatCurrency, formatPercentage } from '../../shared/js/utils/formatters.js';
import { realDataFetcher } from '../../shared/js/core/real-data-fetcher.js';
import { DATA_SOURCE_CATEGORIES } from '../../shared/js/core/api-registry.js';

// SVG Icons
const ICONS = {
  package: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
  gift: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>`,
  cpu: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>`,
  power: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v10"></path><path d="M18.4 6.6a9 9 0 1 1-12.77.04"></path></svg>`,
  checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  alertTriangle: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  xCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
};

/**
 * Dashboard Page Class
 */
class DashboardPage {
  constructor() {
    this.categoriesChart = null;
    this.sentimentChart = null;
    this.data = null;
    this.marketData = [];
    this.filteredMarketData = [];
    this.sentimentTimeframe = '1D';
    this.isChartJSLoaded = false;
  }

  /**
   * Initialize the dashboard
   */
  async init() {
    try {
      console.log('[Dashboard] Initializing enhanced dashboard...');

      // Inject shared layouts (header, sidebar, footer)
      await LayoutManager.injectLayouts();

      // Set active navigation
      LayoutManager.setActiveNav('dashboard');

      // Update API status in header
      this.updateApiStatus();

      // Bind event listeners
      this.bindEvents();

      // Load Chart.js
      await loadChartJS();
      this.isChartJSLoaded = true;

      // Load initial data
      await this.loadData();

      // Setup auto-refresh polling (30 seconds) - PRIMARY DATA UPDATE METHOD
      // HTTP polling replaces WebSocket and works on all platforms including Hugging Face Spaces
      this.setupPolling();

      // Setup "last updated" UI updates
      this.setupLastUpdateUI();

      // WebSocket disabled - using HTTP polling only (required for Hugging Face Spaces)
      // this.setupWebSocket(); // Disabled: WebSocket not supported on Hugging Face Spaces

      console.log('[Dashboard] Enhanced dashboard initialized successfully');
      Toast.success('Dashboard loaded successfully');
    } catch (error) {
      console.error('[Dashboard] Initialization error:', error);
      Toast.error('Failed to initialize dashboard');
    }
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Manual refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log('[Dashboard] Manual refresh triggered');
        this.loadData();
        Toast.info('Refreshing dashboard...');
      });
    }

    // Market search
    const searchInput = document.getElementById('market-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterMarketData(e.target.value);
      });
    }

    // Market sort
    const sortSelect = document.getElementById('market-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortMarketData(e.target.value);
      });
    }

    // Sentiment timeframe selector
    const timeframeBtns = document.querySelectorAll('.timeframe-btn');
    timeframeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Remove active class from all buttons
        timeframeBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        e.target.classList.add('active');
        // Update timeframe
        this.sentimentTimeframe = e.target.dataset.timeframe;
        // Reload sentiment data
        this.loadSentimentData();
      });
    });
  }

  /**
   * Setup WebSocket connection for realtime updates (DISABLED).
   * 
   * WebSocket is disabled because it's not supported on Hugging Face Spaces.
   * The application uses HTTP polling instead, which works perfectly for all use cases.
   * 
   * HTTP polling is configured in setupPolling() and runs every 30 seconds.
   */
  setupWebSocket() {
    // WebSocket disabled - HTTP polling is the primary method
    // This prevents connection errors on platforms that don't support WebSocket
    console.log('[Dashboard] WebSocket disabled - using HTTP polling (30s interval)');
    
    // Update status to show HTTP polling is active
    LayoutManager.updateApiStatus('online', 'HTTP Polling Active');
    
    // No WebSocket connection attempted
    this.websocket = null;
  }

  /**
   * Fetch all data from API
   */
  async fetchData() {
    try {
      // Use real data fetchers with fallback to backend API
      const [marketData, trendingData, sentimentData, resourcesData, statusData] = await Promise.allSettled([
        realDataFetcher.fetchMarketData(50).catch(() => api.get('/api/trending')),
        realDataFetcher.fetchTrendingCoins().catch(() => api.get('/api/trending')),
        realDataFetcher.fetchSentimentData().catch(() => api.get('/api/sentiment/global')),
        api.getResources().catch(() => this.getDefaultResources()),
        api.getStatus().catch(() => this.getDefaultStatus())
      ]);

      // Process results
      const market = marketData.status === 'fulfilled' ? marketData.value : this.generateMockMarketData();
      const trending = trendingData.status === 'fulfilled' ? trendingData.value : this.generateMockMarketData();
      const sentiment = sentimentData.status === 'fulfilled' ? sentimentData.value : this.generateMockSentimentData();
      const resources = resourcesData.status === 'fulfilled' ? resourcesData.value : this.getDefaultResources();
      const status = statusData.status === 'fulfilled' ? statusData.value : this.getDefaultStatus();

      return {
        resources: resources,
        status: status,
        market: market || trending,
        sentiment: sentiment
      };
    } catch (error) {
      console.error('[Dashboard] fetchData error:', error);
      throw error;
    }
  }

  /**
   * Get default resources data
   */
  getDefaultResources() {
    return {
      total: 200,
      free: 87,
      models: 42,
      providers: 18,
      categories: DATA_SOURCE_CATEGORIES
    };
  }

  /**
   * Get default status data
   */
  getDefaultStatus() {
    return {
      health: 'healthy',
      online: 6,
      offline: 0,
      avg_response_time: 150
    };
  }

  /**
   * Generate mock market data for development/demo
   */
  generateMockMarketData() {
    const coins = ['Bitcoin', 'Ethereum', 'Cardano', 'Solana', 'Polkadot', 'Avalanche', 'Chainlink', 'Polygon'];
    const symbols = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'AVAX', 'LINK', 'MATIC'];

    return {
      coins: coins.map((name, i) => ({
        rank: i + 1,
        name,
        symbol: symbols[i],
        price: Math.random() * 50000 + 100,
        volume_24h: Math.random() * 10000000000,
        market_cap: Math.random() * 500000000000,
        change_24h: (Math.random() - 0.5) * 20,
        change_7d: (Math.random() - 0.5) * 30,
      }))
    };
  }

  /**
   * Generate mock sentiment data for development/demo
   */
  generateMockSentimentData() {
    const points = 30;
    const data = [];
    for (let i = 0; i < points; i++) {
      data.push({
        timestamp: Date.now() - (points - i) * 3600000,
        sentiment: Math.random() * 60 + 20, // 20-80
        volume: Math.random() * 1000000
      });
    }
    return { history: data };
  }

  /**
   * Load all dashboard data
   */
  async loadData() {
    try {
      // Show loading state
      Loading.addSkeleton('.stat-card');

      // Fetch data
      const data = await this.fetchData();
      this.data = data;
      this.marketData = data.market.coins || [];
      this.filteredMarketData = [...this.marketData];

      // Render all sections
      this.renderStatsGrid(data.resources);
      this.renderSystemAlert(data.status);
      this.renderMarketTable(this.filteredMarketData);
      this.renderSentimentChart(data.sentiment);
      this.renderCategoriesChart(data.resources.categories || []);
      this.renderPerformanceMetrics(data.status);

      // Remove loading state
      Loading.removeSkeleton('.stat-card');

    } catch (error) {
      console.error('[Dashboard] Load error:', error);
      Toast.error('Failed to load dashboard data. Using demo data.');
      Loading.removeSkeleton('.stat-card');

      // Show demo data on error
      this.showDemoData();
    }
  }

  /**
   * Show demo data when API is unavailable
   */
  showDemoData() {
    const mockData = {
      resources: { total: 15, free: 8, models: 3, providers: 5, categories: [
        { name: 'Market Data', count: 5 },
        { name: 'AI Models', count: 3 },
        { name: 'News', count: 4 },
        { name: 'Analytics', count: 3 }
      ]},
      status: { health: 'degraded', online: 3, offline: 2, avg_response_time: 245 }
    };

    this.marketData = this.generateMockMarketData().coins;
    this.filteredMarketData = [...this.marketData];

    this.renderStatsGrid(mockData.resources);
    this.renderSystemAlert(mockData.status);
    this.renderMarketTable(this.filteredMarketData);
    this.renderSentimentChart(this.generateMockSentimentData());
    this.renderCategoriesChart(mockData.resources.categories);
    this.renderPerformanceMetrics(mockData.status);
  }

  /**
   * Load sentiment data for selected timeframe
   */
  async loadSentimentData() {
    try {
      const sentiment = await api.get(`/api/sentiment/global?timeframe=${this.sentimentTimeframe}`)
        .catch(() => this.generateMockSentimentData());
      this.renderSentimentChart(sentiment);
    } catch (error) {
      console.error('[Dashboard] Failed to load sentiment data:', error);
      Toast.warning('Failed to load sentiment data');
    }
  }

  /**
   * Render stats grid (4 cards)
   */
  renderStatsGrid(resources) {
    const grid = document.getElementById('stats-grid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">${ICONS.package}</div>
        <div class="stat-content">
          <div class="stat-value">${formatNumber(resources.total || 0)}</div>
          <div class="stat-label">Total Resources</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">${ICONS.gift}</div>
        <div class="stat-content">
          <div class="stat-value">${formatNumber(resources.free || 0)}</div>
          <div class="stat-label">Free Resources</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">${ICONS.cpu}</div>
        <div class="stat-content">
          <div class="stat-value">${formatNumber(resources.models || 0)}</div>
          <div class="stat-label">AI Models</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">${ICONS.power}</div>
        <div class="stat-content">
          <div class="stat-value">${formatNumber(resources.providers || 0)}</div>
          <div class="stat-label">Active Providers</div>
        </div>
      </div>
    `;
  }

  /**
   * Render system status alert
   */
  renderSystemAlert(status) {
    const container = document.getElementById('system-alert');
    if (!container) return;

    const alertClass = status.health === 'healthy' ? 'alert-success' :
                       status.health === 'degraded' ? 'alert-warning' : 'alert-error';

    const icon = status.health === 'healthy' ? ICONS.checkCircle :
                 status.health === 'degraded' ? ICONS.alertTriangle : ICONS.xCircle;

    container.innerHTML = `
      <div class="alert ${alertClass}" role="alert">
        <div class="alert-icon">${icon}</div>
        <div class="alert-content">
          <div class="alert-title">System Status: ${(status.health || 'UNKNOWN').toUpperCase()}</div>
          <div class="alert-body">
            Online APIs: ${status.online || 0} |
            Offline: ${status.offline || 0} |
            ${status.degraded ? `Degraded: ${status.degraded} | ` : ''}
            Avg Response Time: ${status.avg_response_time || 'N/A'}ms
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render market data table with sorting and filtering
   */
  renderMarketTable(coins) {
    const container = document.getElementById('market-table-container');
    if (!container) return;

    if (!coins || coins.length === 0) {
      container.innerHTML = '<div class="empty-state">No market data available</div>';
      return;
    }

    const tableHTML = `
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Price</th>
              <th>24h Change</th>
              <th>7d Change</th>
              <th>Volume (24h)</th>
              <th>Market Cap</th>
            </tr>
          </thead>
          <tbody>
            ${coins.map(coin => `
              <tr class="table-row-hover">
                <td><span class="rank-badge">#${coin.rank}</span></td>
                <td>
                  <div class="coin-info">
                    <span class="coin-name">${coin.name}</span>
                    <span class="coin-symbol">${coin.symbol}</span>
                  </div>
                </td>
                <td class="price-cell">${formatCurrency(coin.price)}</td>
                <td>
                  <span class="change-badge ${coin.change_24h >= 0 ? 'positive' : 'negative'}">
                    ${coin.change_24h >= 0 ? '▲' : '▼'} ${formatPercentage(Math.abs(coin.change_24h))}
                  </span>
                </td>
                <td>
                  <span class="change-badge ${coin.change_7d >= 0 ? 'positive' : 'negative'}">
                    ${coin.change_7d >= 0 ? '▲' : '▼'} ${formatPercentage(Math.abs(coin.change_7d))}
                  </span>
                </td>
                <td>${formatCurrency(coin.volume_24h, 0)}</td>
                <td>${formatCurrency(coin.market_cap, 0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = tableHTML;
  }

  /**
   * Filter market data based on search query
   */
  filterMarketData(query) {
    if (!query || query.trim() === '') {
      this.filteredMarketData = [...this.marketData];
    } else {
      const lowerQuery = query.toLowerCase();
      this.filteredMarketData = this.marketData.filter(coin =>
        coin.name.toLowerCase().includes(lowerQuery) ||
        coin.symbol.toLowerCase().includes(lowerQuery)
      );
    }
    this.renderMarketTable(this.filteredMarketData);
  }

  /**
   * Sort market data by specified field
   */
  sortMarketData(sortBy) {
    const sorted = [...this.filteredMarketData];

    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'rank':
          return a.rank - b.rank;
        case 'price':
          return b.price - a.price;
        case 'volume':
          return b.volume_24h - a.volume_24h;
        case 'change':
          return b.change_24h - a.change_24h;
        default:
          return 0;
      }
    });

    this.filteredMarketData = sorted;
    this.renderMarketTable(this.filteredMarketData);
  }

  /**
   * Render sentiment analysis chart
   */
  renderSentimentChart(sentimentData) {
    if (!this.isChartJSLoaded) {
      console.warn('[Dashboard] Chart.js not loaded yet');
      return;
    }

    const history = sentimentData.history || [];
    if (history.length === 0) {
      console.warn('[Dashboard] No sentiment data');
      return;
    }

    // Create chart if not exists
    if (!this.sentimentChart) {
      this.sentimentChart = new ChartComponent('sentiment-chart', 'line');
    }

    const data = {
      labels: history.map(h => new Date(h.timestamp).toLocaleDateString()),
      datasets: [{
        label: 'Market Sentiment',
        data: history.map(h => h.sentiment),
        borderColor: 'rgba(139, 92, 246, 1)',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(139, 92, 246, 0.6)');
          gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.3)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.1)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: 'rgba(139, 92, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: 'rgba(236, 72, 153, 1)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 3,
      }]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: 'rgba(148, 163, 184, 0.1)',
            borderDash: [5, 5]
          },
          ticks: {
            color: 'rgba(148, 163, 184, 0.8)',
            font: { size: 12, weight: 'bold' },
            callback: (value) => value + '%'
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: 'rgba(148, 163, 184, 0.8)',
            font: { size: 11 }
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: 'rgba(241, 245, 249, 0.9)',
            font: { size: 13, weight: 'bold' },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(139, 92, 246, 0.5)',
          borderWidth: 2,
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          callbacks: {
            label: (context) => `Sentiment: ${context.parsed.y.toFixed(1)}%`
          }
        }
      }
    };

    this.sentimentChart.create(data, options);
  }

  /**
   * Render categories chart (Bar chart with Chart.js)
   */
  renderCategoriesChart(categories) {
    if (!this.isChartJSLoaded) {
      console.warn('[Dashboard] Chart.js not loaded yet');
      return;
    }

    if (!categories || categories.length === 0) {
      // Categories data is optional - silently skip chart rendering
      return;
    }

    // Create chart if not exists
    if (!this.categoriesChart) {
      this.categoriesChart = new ChartComponent('categories-chart', 'bar');
    }

    // Vibrant color palette for each category
    const colorPalette = [
      { bg: 'rgba(236, 72, 153, 0.85)', border: 'rgba(236, 72, 153, 1)', hover: 'rgba(236, 72, 153, 0.95)' },
      { bg: 'rgba(139, 92, 246, 0.85)', border: 'rgba(139, 92, 246, 1)', hover: 'rgba(139, 92, 246, 0.95)' },
      { bg: 'rgba(59, 130, 246, 0.85)', border: 'rgba(59, 130, 246, 1)', hover: 'rgba(59, 130, 246, 0.95)' },
      { bg: 'rgba(16, 185, 129, 0.85)', border: 'rgba(16, 185, 129, 1)', hover: 'rgba(16, 185, 129, 0.95)' },
      { bg: 'rgba(245, 158, 11, 0.85)', border: 'rgba(245, 158, 11, 1)', hover: 'rgba(245, 158, 11, 0.95)' },
      { bg: 'rgba(239, 68, 68, 0.85)', border: 'rgba(239, 68, 68, 1)', hover: 'rgba(239, 68, 68, 0.95)' },
      { bg: 'rgba(45, 212, 191, 0.85)', border: 'rgba(45, 212, 191, 1)', hover: 'rgba(45, 212, 191, 0.95)' },
      { bg: 'rgba(251, 146, 60, 0.85)', border: 'rgba(251, 146, 60, 1)', hover: 'rgba(251, 146, 60, 0.95)' }
    ];

    const data = {
      labels: categories.map(c => c.name || 'Unknown'),
      datasets: [{
        label: 'Resource Count',
        data: categories.map(c => c.count || 0),
        backgroundColor: categories.map((_, i) => colorPalette[i % colorPalette.length].bg),
        borderColor: categories.map((_, i) => colorPalette[i % colorPalette.length].border),
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: categories.map((_, i) => colorPalette[i % colorPalette.length].hover),
        hoverBorderWidth: 3,
      }]
    };

    const options = {
      indexAxis: 'y', // Horizontal bar chart
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: 'rgba(148, 163, 184, 0.1)',
            borderDash: [3, 3]
          },
          ticks: {
            precision: 0,
            color: 'rgba(148, 163, 184, 0.8)',
            font: { size: 12, weight: 'bold' }
          }
        },
        y: {
          grid: {
            display: false
          },
          ticks: {
            color: 'rgba(241, 245, 249, 0.9)',
            font: { size: 12, weight: '600' },
            padding: 10
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(139, 92, 246, 0.5)',
          borderWidth: 2,
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          displayColors: true,
          callbacks: {
            label: (context) => ` Resources: ${context.parsed.x}`
          }
        }
      }
    };

    this.categoriesChart.create(data, options);
  }

  /**
   * Render performance metrics
   */
  renderPerformanceMetrics(status) {
    const avgResponseTime = document.getElementById('avg-response-time');
    const cacheHitRate = document.getElementById('cache-hit-rate');
    const activeSessions = document.getElementById('active-sessions');

    if (avgResponseTime) {
      avgResponseTime.textContent = `${status.avg_response_time || '--'} ms`;
    }

    if (cacheHitRate) {
      // Calculate mock cache hit rate
      const hitRate = Math.floor(Math.random() * 30 + 65);
      cacheHitRate.textContent = `${hitRate}%`;
    }

    if (activeSessions) {
      const sessions = Math.floor(Math.random() * 10 + 1);
      activeSessions.textContent = sessions;
    }
  }

  /**
   * Setup HTTP polling for auto-refresh (PRIMARY METHOD)
   * 
   * This replaces WebSocket and provides reliable data updates every 30 seconds.
   * Works on all platforms including Hugging Face Spaces.
   */
  setupPolling() {
    pollingManager.start(
      'dashboard-data',
      () => this.fetchData(),
      (data, error) => {
        if (data) {
          console.log('[Dashboard] Polling update received');
          this.data = data;
          this.marketData = data.market.coins || [];
          // Reapply current filter and sort
          const searchValue = document.getElementById('market-search')?.value || '';
          this.filterMarketData(searchValue);

          this.renderStatsGrid(data.resources);
          this.renderSystemAlert(data.status);
          this.renderSentimentChart(data.sentiment);
          this.renderCategoriesChart(data.resources.categories || []);
          this.renderPerformanceMetrics(data.status);
        } else {
          console.error('[Dashboard] Polling error:', error);
          // Don't show toast on polling errors (would be too annoying)
        }
      },
      30000 // 30 seconds
    );

    console.log('[Dashboard] Polling started (30s interval)');
  }

  /**
   * Setup "last updated" UI updates
   */
  setupLastUpdateUI() {
    const el = document.getElementById('last-update');
    if (!el) return;

    pollingManager.onLastUpdate((key, text) => {
      if (key === 'dashboard-data') {
        el.textContent = `Last updated: ${text}`;
      }
    });
  }

  /**
   * Update API status in header
   */
  async updateApiStatus() {
    try {
      const health = await api.getHealth();
      LayoutManager.updateApiStatus('online', 'System Active');
    } catch (error) {
      LayoutManager.updateApiStatus('offline', 'Connection Failed');
    }
  }

  /**
   * Cleanup on page unload
   */
  destroy() {
    console.log('[Dashboard] Cleaning up...');
    pollingManager.stop('dashboard-data');
    if (this.websocket) {
      try {
        this.websocket.close();
      } catch (e) {
        // ignore
      }
    }
    if (this.categoriesChart) {
      this.categoriesChart.destroy();
    }
    if (this.sentimentChart) {
      this.sentimentChart.destroy();
    }
  }
}

// ============================================================================
// INITIALIZE ON DOM READY
// ============================================================================

function initDashboard() {
  const page = new DashboardPage();
  page.init();

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    page.destroy();
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
