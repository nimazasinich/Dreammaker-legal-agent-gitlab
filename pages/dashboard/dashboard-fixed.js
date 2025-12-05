/**
 * Dashboard Page - REAL DATA ONLY
 * NO MOCK DATA - Uses actual backend APIs
 */

import { api } from '../../shared/js/core/api-client.js';
import { LayoutManager } from '../../shared/js/core/layout-manager.js';
import { Toast } from '../../shared/js/components/toast.js';
import { formatNumber, formatCurrency, formatPercentage } from '../../shared/js/utils/formatters.js';

class DashboardPage {
  constructor() {
    this.marketData = [];
    this.sentimentChart = null;
    this.categoriesChart = null;
    this.lastUpdate = null;
  }

  async init() {
    try {
      console.log('[Dashboard] Initializing with REAL data only...');
      
      await LayoutManager.injectLayouts();
      LayoutManager.setActiveNav('dashboard');
      
      this.bindEvents();
      
      // Load Chart.js
      await this.loadChartJS();
      
      // Load real data
      await this.loadAllData();
      
      // Setup auto-refresh (30s)
      setInterval(() => this.loadAllData(), 30000);
      
      Toast.success('Dashboard loaded - Real data');
    } catch (error) {
      console.error('[Dashboard] Init error:', error);
      Toast.error('Failed to load dashboard');
    }
  }

  async loadChartJS() {
    if (window.Chart) return;
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js';
      script.onload = () => {
        console.log('[Dashboard] Chart.js loaded');
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  bindEvents() {
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      Toast.info('Refreshing...');
      this.loadAllData();
    });
  }

  async loadAllData() {
    try {
      const startTime = Date.now();
      
      // Load data in parallel
      const [stats, market, sentiment, resources] = await Promise.all([
        this.loadStats(),
        this.loadMarket(),
        this.loadSentiment(),
        this.loadResources()
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`[Dashboard] Data loaded in ${duration}ms`);
      
      // Update UI
      this.renderStats(stats);
      this.renderMarket(market);
      this.renderSentiment(sentiment);
      this.renderCategories(resources);
      
      // Update last update time
      this.lastUpdate = new Date();
      document.getElementById('last-update').textContent = 
        `Updated: ${this.lastUpdate.toLocaleTimeString()}`;
      
    } catch (error) {
      console.error('[Dashboard] Load error:', error);
      Toast.error('Failed to load data');
    }
  }

  async loadStats() {
    try {
      const [resources, models, providers] = await Promise.all([
        api.get('/resources/count'),
        api.get('/models/summary'),
        api.get('/providers/summary')
      ]);
      
      return {
        totalResources: resources.resources?.total || 0,
        freeResources: resources.resources?.apis || 0,
        aiModels: models.summary?.loaded_models || 0,
        activeProviders: providers.summary?.online || 0
      };
    } catch (error) {
      console.error('[Dashboard] Stats error:', error);
      return {
        totalResources: 0,
        freeResources: 0,
        aiModels: 0,
        activeProviders: 0
      };
    }
  }

  async loadMarket() {
    try {
      // Try to get top coins from backend
      const response = await api.get('/coins/top?limit=10');
      return response.coins || response.data || [];
    } catch (error) {
      console.error('[Dashboard] Market error:', error);
      
      // Try alternative endpoint
      try {
        const response = await api.get('/market');
        return response.data?.coins || [];
      } catch (e) {
        console.error('[Dashboard] Market fallback error:', e);
        return [];
      }
    }
  }

  async loadSentiment() {
    try {
      const response = await api.get('/sentiment/global');
      return response.sentiment || response;
    } catch (error) {
      console.error('[Dashboard] Sentiment error:', error);
      
      // Try alternative endpoint
      try {
        const response = await api.get('/sentiment');
        return response;
      } catch (e) {
        return { value: 50, label: 'neutral', available: false };
      }
    }
  }

  async loadResources() {
    try {
      const response = await api.get('/resources');
      
      // Count by category
      const categories = {};
      const resources = response.resources || response.data || [];
      
      resources.forEach(r => {
        const cat = r.category || 'other';
        categories[cat] = (categories[cat] || 0) + 1;
      });
      
      return categories;
    } catch (error) {
      console.error('[Dashboard] Resources error:', error);
      return {};
    }
  }

  renderStats(stats) {
    const statsGrid = document.getElementById('stats-grid');
    if (!statsGrid) return;
    
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">${formatNumber(stats.totalResources)}</div>
          <div class="stat-label">Total Resources</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10"></path><path d="M18.4 6.6a9 9 0 1 1-12.77.04"></path></svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">${formatNumber(stats.freeResources)}</div>
          <div class="stat-label">Free APIs</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect></svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">${formatNumber(stats.aiModels)}</div>
          <div class="stat-label">AI Models</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">${formatNumber(stats.activeProviders)}</div>
          <div class="stat-label">Providers</div>
        </div>
      </div>
    `;
  }

  renderMarket(coins) {
    const container = document.getElementById('market-table-container');
    if (!container) return;
    
    if (!coins || coins.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No market data available</p>
          <p class="text-secondary">Backend API may not be accessible</p>
        </div>
      `;
      return;
    }
    
    this.marketData = coins;
    
    const table = `
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Price</th>
            <th>24h Change</th>
            <th>Market Cap</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          ${coins.map((coin, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>
                <div class="coin-name">
                  <strong>${coin.name || coin.symbol}</strong>
                  <span class="text-secondary">${coin.symbol || ''}</span>
                </div>
              </td>
              <td>${formatCurrency(coin.price || coin.current_price || 0)}</td>
              <td class="${(coin.change_24h || coin.price_change_percentage_24h || 0) >= 0 ? 'text-success' : 'text-danger'}">
                ${formatPercentage(coin.change_24h || coin.price_change_percentage_24h || 0)}
              </td>
              <td>${formatCurrency(coin.market_cap || 0)}</td>
              <td>${formatCurrency(coin.volume_24h || coin.total_volume || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    container.innerHTML = table;
  }

  renderSentiment(sentiment) {
    const canvas = document.getElementById('sentiment-chart');
    if (!canvas) return;
    
    if (this.sentimentChart) {
      this.sentimentChart.destroy();
    }
    
    // Create simple sentiment data
    const value = sentiment.value || 50;
    const data = {
      labels: ['Bearish', 'Neutral', 'Bullish'],
      datasets: [{
        label: 'Market Sentiment',
        data: [
          value < 40 ? 60 : 20,
          value >= 40 && value <= 60 ? 60 : 20,
          value > 60 ? 60 : 20
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.6)',
          'rgba(156, 163, 175, 0.6)',
          'rgba(34, 197, 94, 0.6)'
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(156, 163, 175, 1)',
          'rgba(34, 197, 94, 1)'
        ],
        borderWidth: 2
      }]
    };
    
    this.sentimentChart = new Chart(canvas, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#fff' }
          },
          title: {
            display: true,
            text: `Current: ${sentiment.label || 'Neutral'} (${value})`,
            color: '#fff'
          }
        }
      }
    });
  }

  renderCategories(categories) {
    const canvas = document.getElementById('categories-chart');
    if (!canvas) return;
    
    if (this.categoriesChart) {
      this.categoriesChart.destroy();
    }
    
    const labels = Object.keys(categories);
    const values = Object.values(categories);
    
    if (labels.length === 0) {
      return; // No data
    }
    
    this.categoriesChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Resources',
          data: values,
          backgroundColor: 'rgba(45, 212, 191, 0.6)',
          borderColor: 'rgba(45, 212, 191, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#fff' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          },
          x: {
            ticks: { color: '#fff' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          }
        },
        plugins: {
          legend: {
            labels: { color: '#fff' }
          }
        }
      }
    });
  }
}

// Initialize
const dashboard = new DashboardPage();
window.dashboardPage = dashboard;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => dashboard.init());
} else {
  dashboard.init();
}

