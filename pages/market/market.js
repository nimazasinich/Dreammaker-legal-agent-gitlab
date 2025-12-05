/**
 * Market Page - Real-time Market Data
 */

import { APIHelper } from '../../shared/js/utils/api-helper.js';

class MarketPage {
  constructor() {
    this.marketData = [];
    this.allMarketData = [];
    this.sortColumn = 'market_cap';
    this.sortDirection = 'desc';
    this.currentLimit = 50;
  }

  async init() {
    try {
      console.log('[Market] Initializing...');
      
      this.bindEvents();
      await this.loadMarketData();
      
      // Auto-refresh every 30 seconds
      setInterval(() => this.loadMarketData(), 30000);
      
      this.showToast('Market data loaded', 'success');
    } catch (error) {
      console.error('[Market] Init error:', error);
    }
  }

  bindEvents() {
    // Refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      this.loadMarketData(this.currentLimit);
    });
    
    // Search functionality
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this.filterMarketData(e.target.value);
    });

    // Category filter buttons
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.category-filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.filterByCategory(e.target.dataset.category);
      });
    });

    // Timeframe buttons (Top 10, Top 25, Top 50, All)
    document.querySelectorAll('[data-timeframe]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-timeframe]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const timeframe = e.target.dataset.timeframe;
        this.applyLimitFilter(timeframe);
      });
    });

    // Sort dropdown
    document.getElementById('sort-select')?.addEventListener('change', (e) => {
      this.sortMarketData(e.target.value);
    });

    // Export button
    document.getElementById('export-btn')?.addEventListener('click', () => {
      this.exportData();
    });

    // Table header sorting
    document.querySelectorAll('.sortable-header').forEach(header => {
      header.addEventListener('click', () => {
        const column = header.dataset.column;
        this.toggleSort(column);
      });
    });
  }

  async loadMarketData(limit = 50) {
    try {
      let data = [];

      try {
        const json = await APIHelper.fetchAPI(`/api/coins/top?limit=${limit}`);
        // Handle various response formats
        data = APIHelper.extractArray(json, ['markets', 'coins', 'data']);
      } catch (e) {
        console.warn('[Market] Primary API unavailable, using fallback', e);
      }

      // Fallback to CoinGecko if no data
      if (!Array.isArray(data) || data.length === 0) {
        try {
          const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=50');
          if (response.ok) {
            data = await response.json();
          }
        } catch (e) {
          console.warn('[Market] Fallback API also unavailable', e);
        }
      }

      // Use demo data if all APIs fail
      if (!Array.isArray(data) || data.length === 0) {
        data = this.getDemoData();
      }
      
      this.marketData = Array.isArray(data) ? data : [];
      this.renderMarketTable();
      this.updateTimestamp();
    } catch (error) {
      console.error('[Market] Load error:', error);
      this.marketData = this.getDemoData();
      this.renderMarketTable();
      this.showToast('Using demo data - API unavailable', 'warning');
    }
  }

  getDemoData() {
    return [
      { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', current_price: 43250, price_change_percentage_24h: 2.5, market_cap: 850000000000, total_volume: 25000000000 },
      { id: 'ethereum', name: 'Ethereum', symbol: 'eth', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', current_price: 2350, price_change_percentage_24h: 3.2, market_cap: 280000000000, total_volume: 12000000000 },
      { id: 'solana', name: 'Solana', symbol: 'sol', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', current_price: 105, price_change_percentage_24h: -1.8, market_cap: 45000000000, total_volume: 2500000000 }
    ];
  }

  renderMarketTable() {
    const tbody = document.querySelector('#market-table tbody');
    if (!tbody) return;
    
    // Update market stats
    this.updateMarketStats();
    
    if (this.marketData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
      return;
    }
    
    tbody.innerHTML = this.marketData.map((coin, index) => {
      const change = coin.price_change_percentage_24h || 0;
      const changeClass = change >= 0 ? 'positive' : 'negative';
      const arrow = change >= 0 ? '↑' : '↓';
      
      return `
        <tr>
          <td>${index + 1}</td>
          <td class="coin-cell">
            <img src="${coin.image}" alt="${coin.name}" width="32" height="32">
            <div class="coin-info">
              <strong>${coin.name}</strong>
              <span>${coin.symbol.toUpperCase()}</span>
            </div>
          </td>
          <td>$${coin.current_price?.toLocaleString()}</td>
          <td class="${changeClass}">
            ${arrow} ${Math.abs(change).toFixed(2)}%
          </td>
          <td>$${(coin.market_cap / 1e9).toFixed(2)}B</td>
          <td>$${(coin.total_volume / 1e6).toFixed(2)}M</td>
          <td>
            <button class="btn-view" onclick="marketPage.viewDetails('${coin.id}')">
              View
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  filterMarketData(query) {
    if (!Array.isArray(this.marketData)) {
      this.marketData = [];
      return;
    }
    
    const filtered = this.marketData.filter(coin =>
      coin.name.toLowerCase().includes(query.toLowerCase()) ||
      coin.symbol.toLowerCase().includes(query.toLowerCase())
    );
    
    const tbody = document.querySelector('#market-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = filtered.map((coin, index) => {
      const change = coin.price_change_percentage_24h || 0;
      const changeClass = change >= 0 ? 'positive' : 'negative';
      const arrow = change >= 0 ? '↑' : '↓';
      
      return `
        <tr>
          <td>${index + 1}</td>
          <td class="coin-cell">
            <img src="${coin.image}" alt="${coin.name}" width="32" height="32">
            <div class="coin-info">
              <strong>${coin.name}</strong>
              <span>${coin.symbol.toUpperCase()}</span>
            </div>
          </td>
          <td>$${coin.current_price?.toLocaleString()}</td>
          <td class="${changeClass}">
            ${arrow} ${Math.abs(change).toFixed(2)}%
          </td>
          <td>$${(coin.market_cap / 1e9).toFixed(2)}B</td>
          <td>$${(coin.total_volume / 1e6).toFixed(2)}M</td>
          <td>
            <button class="btn-view" onclick="marketPage.viewDetails('${coin.id}')">
              View
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  viewDetails(coinId) {
    const coin = this.marketData.find(c => c.id === coinId);
    if (!coin) return;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${coin.name} (${coin.symbol.toUpperCase()})</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="coin-details">
            <img src="${coin.image}" alt="${coin.name}" width="64" height="64">
            <div class="detail-grid">
              <div class="detail-item">
                <span>Current Price</span>
                <strong>$${coin.current_price?.toLocaleString()}</strong>
              </div>
              <div class="detail-item">
                <span>24h Change</span>
                <strong class="${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">
                  ${coin.price_change_percentage_24h?.toFixed(2)}%
                </strong>
              </div>
              <div class="detail-item">
                <span>Market Cap</span>
                <strong>$${(coin.market_cap / 1e9).toFixed(2)}B</strong>
              </div>
              <div class="detail-item">
                <span>24h Volume</span>
                <strong>$${(coin.total_volume / 1e6).toFixed(2)}M</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  filterByCategory(category) {
    console.log('[Market] Filter by category:', category);
    // Can be extended with real category filtering
    this.renderMarketTable();
  }

  /**
   * Apply limit filter (Top 10, Top 25, Top 50, All)
   * @param {string} timeframe - Filter value from button
   */
  applyLimitFilter(timeframe) {
    let limit = 50;
    switch(timeframe) {
      case '1D':
        limit = 10;
        break;
      case '7D':
        limit = 25;
        break;
      case '30D':
        limit = 50;
        break;
      case '1Y':
        limit = 100;
        break;
      default:
        limit = 50;
    }
    
    this.currentLimit = limit;
    this.loadMarketData(limit);
    this.showToast(`Showing Top ${limit} coins`, 'info');
  }

  sortMarketData(sortBy) {
    if (!Array.isArray(this.marketData)) {
      this.marketData = [];
      return;
    }
    
    const sorted = [...this.marketData].sort((a, b) => {
      switch (sortBy) {
        case 'price_high':
          return (b.current_price || 0) - (a.current_price || 0);
        case 'price_low':
          return (a.current_price || 0) - (b.current_price || 0);
        case 'change_high':
          return (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0);
        case 'change_low':
          return (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0);
        case 'volume':
          return (b.total_volume || 0) - (a.total_volume || 0);
        case 'market_cap':
        default:
          return (b.market_cap || 0) - (a.market_cap || 0);
      }
    });

    this.marketData = sorted;
    this.renderMarketTable();
  }

  toggleSort(column) {
    if (!Array.isArray(this.marketData)) {
      this.marketData = [];
      return;
    }
    
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }

    const sorted = [...this.marketData].sort((a, b) => {
      const aVal = a[column] || 0;
      const bVal = b[column] || 0;
      return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    this.marketData = sorted;
    this.renderMarketTable();
  }

  updateMarketStats() {
    if (!Array.isArray(this.marketData) || this.marketData.length === 0) return;
    
    // Calculate totals
    const totalMcap = this.marketData.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
    const totalVolume = this.marketData.reduce((sum, coin) => sum + (coin.total_volume || 0), 0);
    
    // Get BTC data
    const btcCoin = this.marketData.find(c => c.symbol.toLowerCase() === 'btc');
    const btcMcap = btcCoin?.market_cap || 0;
    const btcDominance = totalMcap > 0 ? (btcMcap / totalMcap) * 100 : 0;
    
    // Update DOM
    const totalMcapEl = document.getElementById('total-mcap');
    const totalVolumeEl = document.getElementById('total-volume');
    const btcDominanceEl = document.getElementById('btc-dominance');
    const activeCoinsEl = document.getElementById('active-coins');
    
    if (totalMcapEl) {
      totalMcapEl.textContent = `$${(totalMcap / 1e12).toFixed(2)}T`;
    }
    if (totalVolumeEl) {
      totalVolumeEl.textContent = `$${(totalVolume / 1e9).toFixed(2)}B`;
    }
    if (btcDominanceEl) {
      btcDominanceEl.textContent = `${btcDominance.toFixed(1)}%`;
      btcDominanceEl.style.color = btcDominance > 50 ? '#10b981' : '#f59e0b';
    }
    if (activeCoinsEl) {
      activeCoinsEl.textContent = this.marketData.length.toString();
    }
  }

  exportData() {
    const csv = [
      ['Rank', 'Name', 'Symbol', 'Price', '24h Change', 'Market Cap', 'Volume'],
      ...this.marketData.map((coin, idx) => [
        idx + 1,
        coin.name,
        coin.symbol.toUpperCase(),
        coin.current_price,
        coin.price_change_percentage_24h,
        coin.market_cap,
        coin.total_volume
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market_data_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    this.showToast('Market data exported', 'success');
  }

  updateTimestamp() {
    const el = document.getElementById('last-update');
    if (el) {
      el.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    }
  }

  showToast(message, type = 'info') {
    APIHelper.showToast(message, type);
  }
}

const marketPage = new MarketPage();
marketPage.init();
window.marketPage = marketPage;
