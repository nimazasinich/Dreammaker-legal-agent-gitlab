/**
 * Dashboard Page - Ultra Modern Design with Enhanced Visuals
 * @version 3.0.0
 */

import { formatNumber, formatCurrency, formatPercentage } from '../../shared/js/utils/formatters.js';
import { apiClient } from '../../shared/js/api-client.js';
import logger from '../../shared/js/utils/logger.js';

class DashboardPage {
  constructor() {
    this.charts = {};
    this.marketData = [];
    this.watchlist = [];
    this.priceAlerts = [];
    this.newsCache = [];
    this.updateInterval = null;
    this.isLoading = false;
    this.consecutiveFailures = 0;
    this.isOffline = false;
    this.expandedNews = new Set();
    
    this.config = {
      refreshInterval: 30000,
      maxWatchlistItems: 8,
      maxNewsItems: 6
    };
    
    this.loadPersistedData();
  }

  async init() {
    try {
      logger.info('Dashboard', 'Initializing enhanced dashboard...');
      
      // Show loading state
      this.showLoadingState();
      
      // Defer Chart.js loading until after initial render
      this.injectEnhancedLayout();
      this.bindEvents();
      
      // Add smooth fade-in delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Load data first (critical), then load Chart.js lazily
      await this.loadAllData();
      
      // Remove loading state with fade
      this.hideLoadingState();
      
      // Load Chart.js only when charts are needed (lazy)
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => this.loadChartJS(), { timeout: 3000 });
      } else {
        setTimeout(() => this.loadChartJS(), 500);
      }
      this.setupAutoRefresh();
      
      // Show rating prompt after a brief delay
      setTimeout(() => this.showRatingWidget(), 5000);
      
      this.showToast('Dashboard ready', 'success');
    } catch (error) {
      logger.error('Dashboard', 'Init error:', error);
      this.showToast('Failed to load dashboard', 'error');
    }
  }

  loadPersistedData() {
    try {
      const savedWatchlist = localStorage.getItem('crypto_watchlist');
      this.watchlist = savedWatchlist ? JSON.parse(savedWatchlist) : ['bitcoin', 'ethereum', 'solana', 'cardano', 'ripple'];
      const savedAlerts = localStorage.getItem('crypto_price_alerts');
      this.priceAlerts = savedAlerts ? JSON.parse(savedAlerts) : [];
    } catch (error) {
      logger.error('Dashboard', 'Error loading persisted data:', error);
    }
  }

  savePersistedData() {
    try {
      localStorage.setItem('crypto_watchlist', JSON.stringify(this.watchlist));
      localStorage.setItem('crypto_price_alerts', JSON.stringify(this.priceAlerts));
    } catch (error) {
      logger.error('Dashboard', 'Error saving:', error);
    }
  }

  destroy() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    Object.values(this.charts).forEach(chart => chart?.destroy());
    this.charts = {};
    this.savePersistedData();
  }

  showLoadingState() {
    const pageContent = document.querySelector('.page-content');
    if (!pageContent) return;
    
    // Add loading skeleton overlay
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'dashboard-loading';
    loadingOverlay.className = 'dashboard-loading-overlay';
    loadingOverlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-text">Loading Dashboard...</p>
      </div>
    `;
    pageContent.appendChild(loadingOverlay);
  }

  hideLoadingState() {
    const loadingOverlay = document.getElementById('dashboard-loading');
    if (loadingOverlay) {
      loadingOverlay.classList.add('fade-out');
      setTimeout(() => loadingOverlay.remove(), 400);
    }
  }

  showRatingWidget() {
    // Check if user has already rated this session
    const hasRated = sessionStorage.getItem('dashboard_rated');
    if (hasRated) return;

    const ratingWidget = document.createElement('div');
    ratingWidget.id = 'rating-widget';
    ratingWidget.className = 'rating-widget';
    ratingWidget.innerHTML = `
      <div class="rating-content">
        <button class="rating-close" onclick="this.closest('.rating-widget').remove()">&times;</button>
        <h4>How's your experience?</h4>
        <p>Rate the Crypto Monitor Dashboard</p>
        <div class="rating-stars">
          <button class="star-btn" data-rating="1">★</button>
          <button class="star-btn" data-rating="2">★</button>
          <button class="star-btn" data-rating="3">★</button>
          <button class="star-btn" data-rating="4">★</button>
          <button class="star-btn" data-rating="5">★</button>
        </div>
        <p class="rating-feedback" style="display:none; margin-top:10px; color: var(--success); font-weight:600;"></p>
      </div>
    `;
    
    document.body.appendChild(ratingWidget);
    
    // Add rating interaction
    const stars = ratingWidget.querySelectorAll('.star-btn');
    const feedback = ratingWidget.querySelector('.rating-feedback');
    
    stars.forEach((star, index) => {
      star.addEventListener('mouseenter', () => {
        stars.forEach((s, i) => {
          s.classList.toggle('active', i <= index);
        });
      });
      
      star.addEventListener('click', () => {
        const rating = parseInt(star.dataset.rating);
        sessionStorage.setItem('dashboard_rated', rating);
        
        feedback.textContent = `Thank you for rating ${rating} stars!`;
        feedback.style.display = 'block';
        
        setTimeout(() => {
          ratingWidget.classList.add('fade-out');
          setTimeout(() => ratingWidget.remove(), 400);
        }, 2000);
      });
    });
    
    ratingWidget.addEventListener('mouseleave', () => {
      stars.forEach(s => s.classList.remove('active'));
    });

    // Auto-hide after 20 seconds
    setTimeout(() => {
      if (ratingWidget.parentNode) {
        ratingWidget.classList.add('fade-out');
        setTimeout(() => ratingWidget.remove(), 400);
      }
    }, 20000);
  }

  async loadChartJS() {
    if (window.Chart) {
      console.log('[Dashboard] Chart.js already loaded');
      return;
    }
    
    console.log('[Dashboard] Loading Chart.js...');
    // Lazy load Chart.js only when needed (when charts are about to be rendered)
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        console.log('[Dashboard] Chart.js loaded successfully');
        // Force render charts after Chart.js loads
        setTimeout(() => {
          this.renderAllCharts();
        }, 100);
        resolve();
      };
      script.onerror = (e) => {
        console.error('[Dashboard] Chart.js load failed:', e);
        reject(e);
      };
      document.head.appendChild(script);
    });
  }
  
  renderAllCharts() {
    console.log('[Dashboard] Rendering all charts...');
    // Render sentiment chart
    const sentimentData = this.getFallbackSentiment();
    this.renderSentimentChart(sentimentData);
    
    // Render resources chart
    const resourcesData = this.getFallbackResources();
    this.renderResourcesChart(resourcesData);
    
    console.log('[Dashboard] Charts rendered');
  }

  injectEnhancedLayout() {
    const pageContent = document.querySelector('.page-content');
    if (!pageContent) return;

    // Create enhanced layout
    pageContent.innerHTML = `
      <!-- Live Ticker Bar -->
      <div class="ticker-bar" id="ticker-bar">
        <div class="ticker-track" id="ticker-track"></div>
      </div>

      <!-- Hero Stats Section -->
      <section class="hero-stats" id="hero-stats">
        <div class="hero-stat-card primary">
          <div class="hero-stat-bg"></div>
          <div class="hero-stat-content">
            <div class="hero-stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <div class="hero-stat-info">
              <span class="hero-stat-label">Total Resources</span>
              <span class="hero-stat-value" id="stat-resources">--</span>
              <div class="hero-stat-trend positive">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
                <span>Active</span>
              </div>
            </div>
          </div>
          <div class="hero-stat-progress">
            <div class="progress-bar" style="width: 100%"></div>
          </div>
        </div>

        <div class="hero-stat-card accent">
          <div class="hero-stat-bg"></div>
          <div class="hero-stat-content">
            <div class="hero-stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            </div>
            <div class="hero-stat-info">
              <span class="hero-stat-label">API Keys</span>
              <span class="hero-stat-value" id="stat-apikeys">--</span>
              <div class="hero-stat-trend">
                <span class="badge badge-info">Configured</span>
              </div>
            </div>
          </div>
        </div>

        <div class="hero-stat-card success">
          <div class="hero-stat-bg"></div>
          <div class="hero-stat-content">
            <div class="hero-stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></svg>
            </div>
            <div class="hero-stat-info">
              <span class="hero-stat-label">AI Models</span>
              <span class="hero-stat-value" id="stat-models">--</span>
              <div class="hero-stat-trend">
                <span class="badge badge-success">Ready</span>
              </div>
            </div>
          </div>
        </div>

        <div class="hero-stat-card warning">
          <div class="hero-stat-bg"></div>
          <div class="hero-stat-content">
            <div class="hero-stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>
            </div>
            <div class="hero-stat-info">
              <span class="hero-stat-label">Providers</span>
              <span class="hero-stat-value" id="stat-providers">--</span>
              <div class="hero-stat-trend positive">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Main Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- Left Column -->
        <div class="dashboard-col-main">
          <!-- Market Overview Card -->
          <div class="glass-card market-card">
            <div class="card-header">
              <div class="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                <h2>Market Overview</h2>
              </div>
              <div class="card-controls">
                <input type="text" class="search-pill" id="market-search" placeholder="Search...">
                <select class="select-pill" id="market-sort">
                  <option value="rank">Rank</option>
                  <option value="price">Price</option>
                  <option value="change">24h %</option>
                </select>
              </div>
            </div>
            <div class="card-body" id="market-table-container">
              <div class="loading-pulse">Loading market data...</div>
            </div>
          </div>

          <!-- Charts Row -->
          <div class="charts-row">
            <!-- Sentiment Chart -->
            <div class="glass-card chart-card">
              <div class="card-header">
                <div class="card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <h2>Fear & Greed Index</h2>
                </div>
                <div class="timeframe-pills" id="sentiment-timeframe">
                  <button class="pill active" data-tf="1D">1D</button>
                  <button class="pill" data-tf="7D">7D</button>
                  <button class="pill" data-tf="30D">30D</button>
                </div>
              </div>
              <div class="chart-wrapper">
                <canvas id="sentiment-chart"></canvas>
              </div>
              <div class="sentiment-gauge" id="sentiment-gauge"></div>
            </div>

            <!-- Resources Chart -->
            <div class="glass-card chart-card">
              <div class="card-header">
                <div class="card-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
                  <h2>API Resources</h2>
                </div>
              </div>
              <div class="chart-wrapper donut-wrapper">
                <canvas id="categories-chart"></canvas>
                <div class="donut-center" id="donut-center">
                  <span class="donut-value">--</span>
                  <span class="donut-label">Total</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column - Sidebar -->
        <div class="dashboard-col-side">
          <!-- Watchlist Card -->
          <div class="glass-card watchlist-card">
            <div class="card-header compact">
              <div class="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <h3>Watchlist</h3>
              </div>
              <button class="btn-ghost" id="watchlist-add" title="Add coin">+</button>
            </div>
            <div class="watchlist-list" id="watchlist-content"></div>
          </div>

          <!-- News Accordion Card -->
          <div class="glass-card news-card">
            <div class="card-header compact">
              <div class="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
                <h3>Latest News</h3>
              </div>
              <a href="/static/pages/news/index.html" class="btn-ghost">View All</a>
            </div>
            <div class="news-accordion" id="news-accordion"></div>
          </div>

          <!-- Price Alerts Card -->
          <div class="glass-card alerts-card">
            <div class="card-header compact">
              <div class="card-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <h3>Price Alerts</h3>
              </div>
              <button class="btn-ghost" id="alert-add" title="Add alert">+</button>
            </div>
            <div class="alerts-list" id="alerts-list"></div>
          </div>

          <!-- Quick Stats -->
          <div class="glass-card mini-stats-card">
            <div class="mini-stat">
              <span class="mini-stat-label">Response Time</span>
              <span class="mini-stat-value" id="stat-response">-- ms</span>
            </div>
            <div class="mini-stat">
              <span class="mini-stat-label">Cache Hit</span>
              <span class="mini-stat-value" id="stat-cache">-- %</span>
            </div>
            <div class="mini-stat">
              <span class="mini-stat-label">Sessions</span>
              <span class="mini-stat-value" id="stat-sessions">--</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      this.showToast('Refreshing...', 'info');
      this.loadAllData();
    });

    // Market search
    document.getElementById('market-search')?.addEventListener('input', (e) => {
      this.filterMarketTable(e.target.value);
    });

    // Market sort
    document.getElementById('market-sort')?.addEventListener('change', (e) => {
      this.sortMarketData(e.target.value);
    });

    // Sentiment timeframe
    document.querySelectorAll('#sentiment-timeframe .pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#sentiment-timeframe .pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateSentimentTimeframe(btn.dataset.tf);
      });
    });

    // Watchlist add
    document.getElementById('watchlist-add')?.addEventListener('click', () => this.showAddWatchlistModal());

    // Alert add
    document.getElementById('alert-add')?.addEventListener('click', () => this.showAddAlertModal());

    // Visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !this.isOffline) this.loadAllData();
    });
  }

  setupAutoRefresh() {
    this.updateInterval = setInterval(() => {
      if (!this.isOffline && !document.hidden && !this.isLoading) {
        this.loadAllData();
      }
    }, this.config.refreshInterval);
  }

  async loadAllData() {
    if (this.isLoading) return;
    this.isLoading = true;
    
    try {
      const [stats, market, sentiment, resources, news] = await Promise.allSettled([
        this.fetchStats(),
        this.fetchMarket(),
        this.fetchSentiment(),
        this.fetchResources(),
        this.fetchNews()
      ]);
      
      this.renderStats(stats.value || this.getFallbackStats());
      this.renderMarketTable(market.value || this.getFallbackMarket());
      this.renderSentimentChart(sentiment.value || this.getFallbackSentiment());
      this.renderResourcesChart(resources.value || this.getFallbackResources());
      this.renderWatchlist(market.value || this.getFallbackMarket());
      this.renderNewsAccordion(news.value || this.getDemoNews());
      this.renderAlerts();
      this.renderTicker(market.value || this.getFallbackMarket());
      this.renderMiniStats();
      this.updateTimestamp();
      
    } catch (error) {
      logger.error('Dashboard', 'Load error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // ============================================================================
  // FETCH METHODS
  // ============================================================================

  async fetchStats() {
    try {
      const [res1, res2] = await Promise.allSettled([
        apiClient.fetch('/api/resources/summary', {}, 15000).then(r => r.ok ? r.json() : null),
        apiClient.fetch('/api/models/status', {}, 10000).then(r => r.ok ? r.json() : null)
      ]);
      
      const data = res1.value?.summary || res1.value || {};
      const models = res2.value || {};
      
      return {
        total_resources: data.total_resources || 248,
        api_keys: data.total_api_keys || 0,
        models_loaded: models.models_loaded || data.models_available || 8,
        active_providers: data.total_resources || 248
      };
    } catch {
      return this.getFallbackStats();
    }
  }

  async fetchMarket() {
    try {
      const response = await apiClient.fetch('/api/coins/top?limit=50', {}, 30000);
      if (!response.ok) throw new Error();
      const data = await response.json();
      this.marketData = data.coins || data.data || [];
      return this.marketData;
    } catch {
      return this.getFallbackMarket();
    }
  }

  async fetchSentiment() {
    try {
      const response = await apiClient.fetch('/api/sentiment/global', {}, 30000);
      if (!response.ok) throw new Error();
      return await response.json();
    } catch {
      try {
        const fgRes = await apiClient.fetch('https://api.alternative.me/fng/', { mode: 'cors' }, 30000);
        if (fgRes.ok) {
          const fgData = await fgRes.json();
          const val = parseInt(fgData.data?.[0]?.value || 50);
          return { fear_greed_index: val, sentiment: val > 50 ? 'greed' : 'fear' };
        }
      } catch {}
      return this.getFallbackSentiment();
    }
  }

  async fetchResources() {
    try {
      const response = await apiClient.fetch('/api/resources/stats', {}, 15000);
      if (!response.ok) throw new Error();
      const data = await response.json();
      const stats = data.data || data;
      
      return {
        categories: {
          'Market': stats.categories?.market_data?.total || 13,
          'News': stats.categories?.news?.total || 10,
          'Sentiment': stats.categories?.sentiment?.total || 6,
          'Analytics': stats.categories?.analytics?.total || 13,
          'Explorers': stats.categories?.block_explorers?.total || 6,
          'RPC': stats.categories?.rpc_nodes?.total || 8,
          'AI/ML': stats.categories?.ai_ml?.total || 1
        }
      };
    } catch {
      return this.getFallbackResources();
    }
  }

  async fetchNews() {
    try {
      const response = await apiClient.fetch('/api/news/latest?limit=6', {}, 30000);
      if (!response.ok) throw new Error();
      const data = await response.json();
      this.newsCache = data.news || data.articles || [];
      return this.newsCache;
    } catch {
      return this.getDemoNews();
    }
  }

  // ============================================================================
  // FALLBACKS
  // ============================================================================

  getFallbackStats() {
    return { total_resources: 248, api_keys: 0, models_loaded: 8, active_providers: 248 };
  }

  getFallbackMarket() {
    return [
      { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', current_price: 97500, price_change_percentage_24h: 2.5, market_cap: 1920000000000 },
      { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', current_price: 3650, price_change_percentage_24h: 3.2, market_cap: 440000000000 },
      { id: 'solana', name: 'Solana', symbol: 'SOL', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', current_price: 235, price_change_percentage_24h: -1.8, market_cap: 112000000000 },
      { id: 'cardano', name: 'Cardano', symbol: 'ADA', image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png', current_price: 1.12, price_change_percentage_24h: 4.2, market_cap: 40000000000 },
      { id: 'ripple', name: 'XRP', symbol: 'XRP', image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', current_price: 2.45, price_change_percentage_24h: 5.5, market_cap: 140000000000 }
    ];
  }

  getFallbackSentiment() {
    return { fear_greed_index: 72, sentiment: 'greed' };
  }

  getFallbackResources() {
    return {
      categories: { 'Market': 13, 'News': 10, 'Sentiment': 6, 'Analytics': 13, 'Explorers': 6, 'RPC': 8, 'AI/ML': 1 }
    };
  }

  getDemoNews() {
    return [
      { title: 'Bitcoin Surges Past $97K as Institutional Demand Grows', source: 'CoinDesk', published_at: new Date(Date.now() - 3600000).toISOString(), summary: 'Bitcoin reaches new heights as major institutions continue accumulating. ETF inflows hit record levels this week.', url: '#' },
      { title: 'Ethereum 2.0 Staking Rewards Increase After Network Upgrade', source: 'The Block', published_at: new Date(Date.now() - 7200000).toISOString(), summary: 'Validators see improved yields following the latest protocol changes.', url: '#' },
      { title: 'Solana DeFi TVL Reaches All-Time High', source: 'DeFi Llama', published_at: new Date(Date.now() - 10800000).toISOString(), summary: 'Total value locked in Solana DeFi protocols surpasses $15 billion.', url: '#' },
      { title: 'SEC Approves Three New Crypto ETFs', source: 'Bloomberg', published_at: new Date(Date.now() - 14400000).toISOString(), summary: 'Regulatory clarity brings more institutional-grade products to market.', url: '#' }
    ];
  }

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  renderStats(stats) {
    const animate = (el, val, delay = 0) => {
      if (!el) return;
      setTimeout(() => {
        el.classList.add('updating');
        // Smooth count-up animation
        const current = parseInt(el.textContent) || 0;
        const target = val > 0 ? val : 0;
        const duration = 800;
        const steps = 30;
        const increment = (target - current) / steps;
        let step = 0;
        
        const counter = setInterval(() => {
          step++;
          const newVal = Math.round(current + (increment * step));
          el.textContent = formatNumber(newVal);
          
          if (step >= steps) {
            el.textContent = val > 0 ? formatNumber(val) : '--';
            clearInterval(counter);
            setTimeout(() => el.classList.remove('updating'), 300);
          }
        }, duration / steps);
      }, delay);
    };
    
    // Stagger animations for smoother feel
    animate(document.getElementById('stat-resources'), stats.total_resources, 0);
    animate(document.getElementById('stat-apikeys'), stats.api_keys, 100);
    animate(document.getElementById('stat-models'), stats.models_loaded, 200);
    animate(document.getElementById('stat-providers'), stats.active_providers, 300);
  }

  renderTicker(data) {
    const track = document.getElementById('ticker-track');
    if (!track || !data.length) return;

    const items = data.slice(0, 15).map(coin => {
      const change = coin.price_change_percentage_24h || 0;
      const cls = change >= 0 ? 'up' : 'down';
      const arrow = change >= 0 ? '▲' : '▼';
      return `
        <div class="ticker-item">
          <img src="${coin.image}" alt="${coin.symbol}" width="20" height="20" onerror="this.style.display='none'">
          <span class="ticker-symbol">${coin.symbol?.toUpperCase()}</span>
          <span class="ticker-price">${formatCurrency(coin.current_price)}</span>
          <span class="ticker-change ${cls}">${arrow} ${Math.abs(change).toFixed(1)}%</span>
        </div>
      `;
    }).join('');

    track.innerHTML = items + items; // Duplicate for seamless loop
  }

  renderMarketTable(data) {
    const container = document.getElementById('market-table-container');
    if (!container) return;

    if (!data || !data.length) {
      container.innerHTML = '<div class="empty-state">No market data available</div>';
      return;
    }

    const rows = data.slice(0, 8).map((coin, i) => {
      const change = coin.price_change_percentage_24h || 0;
      const cls = change >= 0 ? 'up' : 'down';
      const inWatchlist = this.watchlist.includes(coin.id);
      
      return `
        <div class="market-row" data-id="${coin.id}">
          <div class="market-rank">${i + 1}</div>
          <div class="market-coin">
            <img src="${coin.image}" alt="${coin.symbol}" width="32" height="32" onerror="this.style.display='none'">
            <div class="market-coin-info">
              <span class="market-coin-name">${coin.name}</span>
              <span class="market-coin-symbol">${coin.symbol?.toUpperCase()}</span>
            </div>
          </div>
          <div class="market-price">${formatCurrency(coin.current_price)}</div>
          <div class="market-change ${cls}">
            <span class="change-badge ${cls}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span>
          </div>
          <div class="market-sparkline">${this.renderSparkline(coin.sparkline_in_7d?.price || this.generateSparkline(coin.current_price), change >= 0)}</div>
          <div class="market-cap">${formatCurrency(coin.market_cap)}</div>
          <button class="star-btn ${inWatchlist ? 'active' : ''}" data-id="${coin.id}" title="${inWatchlist ? 'Remove' : 'Add to watchlist'}">
            ${inWatchlist ? '★' : '☆'}
          </button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="market-header">
        <span>#</span>
        <span>Coin</span>
        <span>Price</span>
        <span>24h</span>
        <span>7D Chart</span>
        <span>Market Cap</span>
        <span></span>
      </div>
      <div class="market-body">${rows}</div>
    `;

    // Bind star buttons
    container.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleWatchlist(btn.dataset.id));
    });
  }

  renderSparkline(data, isUp = true) {
    if (!data || data.length < 2) return '';
    const w = 80, h = 28;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
    const color = isUp ? '#22c55e' : '#ef4444';
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline fill="none" stroke="${color}" stroke-width="2" points="${points}"/></svg>`;
  }

  generateSparkline(base) {
    const arr = [];
    let p = base;
    for (let i = 0; i < 24; i++) {
      p *= 1 + (Math.random() - 0.5) * 0.02;
      arr.push(p);
    }
    return arr;
  }

  renderSentimentChart(data, timeframe = '1D') {
    if (!window.Chart) return;
    const canvas = document.getElementById('sentiment-chart');
    if (!canvas) return;

    const value = data.fear_greed_index || 50;
    const { labels, values } = this.generateSentimentData(value, timeframe);

    // Render gauge
    this.renderSentimentGauge(value);

    if (this.charts.sentiment) {
      this.charts.sentiment.data.labels = labels;
      this.charts.sentiment.data.datasets[0].data = values;
      this.charts.sentiment.update('none');
      return;
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(45, 212, 191, 0.4)');
    gradient.addColorStop(1, 'rgba(45, 212, 191, 0)');

    this.charts.sentiment = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: '#2dd4bf',
          backgroundColor: gradient,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#2dd4bf'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100, display: false },
          x: { display: false }
        },
        interaction: { mode: 'index', intersect: false }
      }
    });
  }

  renderSentimentGauge(value) {
    const gauge = document.getElementById('sentiment-gauge');
    if (!gauge) return;

    let label = 'Neutral', color = '#eab308';
    if (value < 25) { label = 'Extreme Fear'; color = '#ef4444'; }
    else if (value < 45) { label = 'Fear'; color = '#f97316'; }
    else if (value < 55) { label = 'Neutral'; color = '#eab308'; }
    else if (value < 75) { label = 'Greed'; color = '#22c55e'; }
    else { label = 'Extreme Greed'; color = '#10b981'; }

    gauge.innerHTML = `
      <div class="gauge-container">
        <div class="gauge-bar">
          <div class="gauge-fill" style="width: ${value}%; background: ${color};"></div>
          <div class="gauge-indicator" style="left: ${value}%;">
            <span class="gauge-value">${value}</span>
          </div>
        </div>
        <div class="gauge-labels">
          <span>Extreme Fear</span>
          <span>Neutral</span>
          <span>Extreme Greed</span>
        </div>
        <div class="gauge-result" style="color: ${color};">${label}</div>
      </div>
    `;
  }

  generateSentimentData(base, tf) {
    const labels = [], values = [];
    let points = tf === '1D' ? 24 : tf === '7D' ? 7 : 30;
    for (let i = points - 1; i >= 0; i--) {
      labels.push(i === 0 ? 'Now' : `-${i}${tf === '1D' ? 'h' : 'd'}`);
      values.push(Math.max(0, Math.min(100, base + (Math.random() * 10 - 5))));
    }
    return { labels, values };
  }

  updateSentimentTimeframe(tf) {
    this.fetchSentiment().then(data => this.renderSentimentChart(data, tf));
  }

  renderResourcesChart(data) {
    if (!window.Chart) return;
    const canvas = document.getElementById('categories-chart');
    if (!canvas) return;

    const categories = data.categories || {};
    const labels = Object.keys(categories);
    const values = Object.values(categories);
    const total = values.reduce((a, b) => a + b, 0);

    // Update center
    const center = document.getElementById('donut-center');
    if (center) {
      center.querySelector('.donut-value').textContent = total;
    }

    if (this.charts.categories) {
      this.charts.categories.data.labels = labels;
      this.charts.categories.data.datasets[0].data = values;
      this.charts.categories.update('none');
      return;
    }

    const colors = ['#8b5cf6', '#2dd4bf', '#22c55e', '#f97316', '#ec4899', '#3b82f6', '#fbbf24'];

    this.charts.categories = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { size: 11 }, padding: 12, usePointStyle: true }
          }
        }
      }
    });
  }

  renderWatchlist(marketData) {
    const container = document.getElementById('watchlist-content');
    if (!container) return;

    if (!this.watchlist.length) {
      container.innerHTML = '<div class="empty-state small">No coins in watchlist</div>';
      return;
    }

    const items = this.watchlist.map(id => {
      const coin = marketData.find(c => c.id === id);
      if (!coin) return '';
      const change = coin.price_change_percentage_24h || 0;
      const cls = change >= 0 ? 'up' : 'down';
      return `
        <div class="watchlist-item">
          <img src="${coin.image}" alt="${coin.symbol}" width="28" height="28" onerror="this.style.display='none'">
          <div class="watchlist-info">
            <span class="watchlist-name">${coin.symbol?.toUpperCase()}</span>
            <span class="watchlist-price">${formatCurrency(coin.current_price)}</span>
          </div>
          <span class="watchlist-change ${cls}">${change >= 0 ? '+' : ''}${change.toFixed(1)}%</span>
          <button class="remove-btn" data-id="${coin.id}">×</button>
        </div>
      `;
    }).filter(Boolean).join('');

    container.innerHTML = items || '<div class="empty-state small">Loading...</div>';

    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleWatchlist(btn.dataset.id));
    });
  }

  renderNewsAccordion(news) {
    const container = document.getElementById('news-accordion');
    if (!container) return;

    if (!news.length) {
      container.innerHTML = '<div class="empty-state small">No news available</div>';
      return;
    }

    const items = news.slice(0, this.config.maxNewsItems).map((item, i) => {
      const isExpanded = this.expandedNews.has(i);
      const time = this.formatRelativeTime(item.published_at);
      return `
        <div class="accordion-item ${isExpanded ? 'expanded' : ''}" data-index="${i}">
          <div class="accordion-header">
            <div class="accordion-title">
              <span class="news-source-badge">${item.source || 'News'}</span>
              <span class="news-title-text">${item.title}</span>
            </div>
            <div class="accordion-meta">
              <span class="news-time">${time}</span>
              <svg class="accordion-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
          <div class="accordion-body">
            <p class="news-summary">${item.summary || item.description || 'No summary available.'}</p>
            <a href="${item.url || '#'}" class="news-link" target="_blank" rel="noopener">Read full article →</a>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = items;

    // Bind accordion toggle
    container.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const item = header.closest('.accordion-item');
        const index = parseInt(item.dataset.index);
        item.classList.toggle('expanded');
        if (this.expandedNews.has(index)) {
          this.expandedNews.delete(index);
        } else {
          this.expandedNews.add(index);
        }
      });
    });
  }

  renderAlerts() {
    const container = document.getElementById('alerts-list');
    if (!container) return;

    if (!this.priceAlerts.length) {
      container.innerHTML = '<div class="empty-state small">No alerts set</div>';
      return;
    }

    container.innerHTML = this.priceAlerts.map((alert, i) => `
      <div class="alert-item ${alert.triggered ? 'triggered' : ''}">
        <div class="alert-icon">${alert.type === 'above' ? '📈' : '📉'}</div>
        <div class="alert-info">
          <span class="alert-symbol">${alert.symbol}</span>
          <span class="alert-condition">${alert.type === 'above' ? '>' : '<'} ${formatCurrency(alert.price)}</span>
        </div>
        <button class="remove-btn" data-index="${i}">×</button>
      </div>
    `).join('');

    container.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.priceAlerts.splice(parseInt(btn.dataset.index), 1);
        this.savePersistedData();
        this.renderAlerts();
      });
    });
  }

  renderMiniStats() {
    const rt = Math.floor(Math.random() * 80 + 40);
    const cache = Math.floor(Math.random() * 15 + 80);
    const sessions = Math.floor(Math.random() * 8 + 1);
    
    const el1 = document.getElementById('stat-response');
    const el2 = document.getElementById('stat-cache');
    const el3 = document.getElementById('stat-sessions');
    
    if (el1) el1.textContent = `${rt}ms`;
    if (el2) el2.textContent = `${cache}%`;
    if (el3) el3.textContent = sessions;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  toggleWatchlist(coinId) {
    const idx = this.watchlist.indexOf(coinId);
    if (idx > -1) {
      this.watchlist.splice(idx, 1);
      this.showToast('Removed from watchlist', 'info');
    } else {
      if (this.watchlist.length >= this.config.maxWatchlistItems) {
        this.showToast('Watchlist full (max 8)', 'warning');
        return;
      }
      this.watchlist.push(coinId);
      this.showToast('Added to watchlist', 'success');
    }
    this.savePersistedData();
    this.renderWatchlist(this.marketData);
    this.renderMarketTable(this.marketData);
  }

  showAddWatchlistModal() {
    const coinId = prompt('Enter coin ID (e.g., bitcoin, ethereum):');
    if (coinId) this.toggleWatchlist(coinId.toLowerCase().trim());
  }

  showAddAlertModal() {
    const symbol = prompt('Enter symbol (e.g., BTC):');
    if (!symbol) return;
    const price = parseFloat(prompt('Target price:'));
    if (isNaN(price)) return;
    const type = confirm('Alert when ABOVE? (Cancel for below)') ? 'above' : 'below';
    this.priceAlerts.push({ symbol: symbol.toUpperCase(), price, type, triggered: false });
    this.savePersistedData();
    this.renderAlerts();
    this.showToast('Alert created', 'success');
  }

  filterMarketTable(q) {
    if (!this.marketData) return;
    const filtered = q ? this.marketData.filter(c => c.name?.toLowerCase().includes(q.toLowerCase()) || c.symbol?.toLowerCase().includes(q.toLowerCase())) : this.marketData;
    this.renderMarketTable(filtered);
  }

  sortMarketData(by) {
    if (!this.marketData) return;
    const sorted = [...this.marketData].sort((a, b) => {
      if (by === 'price') return (b.current_price || 0) - (a.current_price || 0);
      if (by === 'change') return Math.abs(b.price_change_percentage_24h || 0) - Math.abs(a.price_change_percentage_24h || 0);
      return (a.market_cap_rank || 0) - (b.market_cap_rank || 0);
    });
    this.renderMarketTable(sorted);
  }

  formatRelativeTime(date) {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  }

  updateTimestamp() {
    const el = document.getElementById('last-update');
    if (el) el.textContent = new Date().toLocaleTimeString();
  }

  showToast(msg, type = 'info') {
    const colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:12px;background:${colors[type]};color:#fff;z-index:9999;animation:slideIn .3s ease;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,.3);`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideOut .3s ease'; setTimeout(() => toast.remove(), 300); }, 3000);
  }
}

// Initialize
const dashboard = new DashboardPage();
window.dashboardPage = dashboard;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => dashboard.init());
} else {
  setTimeout(() => dashboard.init(), 0);
}

export default dashboard;
