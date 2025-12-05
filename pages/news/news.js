/**
 * News Page - Crypto News Feed with News API Integration
 */

import { NEWS_CONFIG } from './news-config.js';

class NewsPage {
  constructor() {
    this.articles = [];
    this.allArticles = [];
    this.refreshInterval = null;
    this.isLoading = false;
    this.currentFilters = {
      keyword: '',
      source: '',
      sentiment: ''
    };
    this.config = NEWS_CONFIG;
  }

  async init() {
    try {
      console.log('[News] Initializing...');
      
      this.bindEvents();
      await this.loadNews();
      
      // Auto-refresh based on config
      if (this.config.autoRefreshInterval > 0) {
        this.refreshInterval = setInterval(() => {
          if (!this.isLoading) {
            this.loadNews();
          }
        }, this.config.autoRefreshInterval);
      }
      
      this.showToast('News loaded', 'success');
    } catch (error) {
      console.error('[News] Init error:', error);
    }
  }

  /**
   * Cleanup on page unload
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  bindEvents() {
    // Refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      this.loadNews();
    });

    // Search functionality - debounced
    let searchTimeout;
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.currentFilters.keyword = e.target.value.trim();
        this.applyFilters();
      }, 300);
    });

    // Source filter
    document.getElementById('source-select')?.addEventListener('change', (e) => {
      this.currentFilters.source = e.target.value;
      this.applyFilters();
    });

    // Sentiment filter
    document.getElementById('sentiment-select')?.addEventListener('change', (e) => {
      this.currentFilters.sentiment = e.target.value;
      this.applyFilters();
    });

    // Summarize button
    document.getElementById('summarize-btn')?.addEventListener('click', () => {
      this.summarizeNews();
    });
  }

  /**
   * Load news from News API with comprehensive error handling
   * @param {boolean} forceRefresh - Skip cache and fetch fresh data
   */
  async loadNews(forceRefresh = false) {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    try {
      let data = [];
      
      try {
        data = await this.fetchFromNewsAPI();
      } catch (error) {
        console.error('[News] News API request failed:', error);
        this.handleAPIError(error);
      }

      if (data.length === 0) {
        console.warn('[News] No articles from API, using demo data');
        data = this.getDemoNews();
        this.showToast('Using demo data - API unavailable', 'warning');
      } else {
        this.showToast(`Loaded ${data.length} articles`, 'success');
      }
      
      this.allArticles = [...data];
      this.applyFilters();
      this.populateSourceDropdown();
      this.updateTimestamp();
    } catch (error) {
      console.error('[News] Load error:', error);
      this.articles = this.getDemoNews();
      this.allArticles = [...this.articles];
      this.renderNews();
      this.showToast('Error loading news - using demo data', 'error');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Fetch news articles from backend API
   * @returns {Promise<Array>} Array of formatted news articles
   */
  async fetchFromNewsAPI() {
    try {
      // Try backend API first
      const limit = this.config.pageSize || 50;
      let response = await fetch(`/api/news?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Handle different response formats
        let articles = [];
        if (data.news && Array.isArray(data.news)) {
          // Backend returns { success, news, count }
          articles = data.news;
        } else if (data.articles && Array.isArray(data.articles)) {
          articles = data.articles;
        } else if (data.data && Array.isArray(data.data)) {
          articles = data.data;
        } else if (Array.isArray(data)) {
          articles = data;
        }
        
        if (articles.length > 0) {
          return this.formatBackendNewsArticles(articles);
        }
      }
      
      // Fallback: Try alternative endpoint
      response = await fetch(`/api/news/latest?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const data = await response.json();
        let articles = [];
        if (data.articles && Array.isArray(data.articles)) {
          articles = data.articles;
        } else if (data.data && Array.isArray(data.data)) {
          articles = data.data;
        } else if (Array.isArray(data)) {
          articles = data;
        }
        
        if (articles.length > 0) {
          return this.formatBackendNewsArticles(articles);
        }
      }
      
      throw new Error('No articles found from backend API');
      
    } catch (error) {
      console.warn('[News] Backend API failed, trying direct News API:', error);
      
      // Fallback to direct News API if backend fails
      const searchQuery = this.currentFilters.keyword || this.config.defaultQuery;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - this.config.daysBack);
      
      const params = new URLSearchParams({
        q: searchQuery,
        from: fromDate.toISOString().split('T')[0],
        sortBy: 'publishedAt',
        language: this.config.language,
        pageSize: this.config.pageSize,
        apiKey: this.config.apiKey
      });

      const url = `${this.config.baseUrl}/everything?${params.toString()}`;
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          throw new Error(`News API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'error') {
          throw new Error(data.message || 'API returned error status');
        }

        if (!data.articles || !Array.isArray(data.articles)) {
          throw new Error('Invalid API response format');
        }

        return this.formatNewsAPIArticles(data.articles);
        
      } catch (fallbackError) {
        if (fallbackError.name === 'TypeError' && fallbackError.message.includes('fetch')) {
          throw new Error('No internet connection');
        }
        throw fallbackError;
      }
    }
  }
  
  /**
   * Format backend API articles to internal format
   * @param {Array} articles - Raw articles from backend API
   * @returns {Array} Formatted articles
   */
  formatBackendNewsArticles(articles) {
    return articles
      .filter(article => article.title && article.title !== '[Removed]')
      .map(article => ({
        title: article.title,
        content: article.description || article.content || article.summary || article.body || 'No description available',
        body: article.description || article.content || article.summary || article.body,
        source: {
          title: article.source?.name || article.source?.title || article.source || 'Unknown Source'
        },
        published_at: article.publishedAt || article.published_at || article.created_at,
        url: article.url || '#',
        urlToImage: article.urlToImage || article.image || '',
        author: article.author || '',
        sentiment: article.sentiment || this.analyzeSentiment(article.title + ' ' + (article.description || article.content || '')),
        category: article.category || 'crypto'
      }));
  }

  /**
   * Format News API articles to internal format
   * @param {Array} articles - Raw articles from News API
   * @returns {Array} Formatted articles
   */
  formatNewsAPIArticles(articles) {
    return articles
      .filter(article => article.title && article.title !== '[Removed]')
      .map(article => ({
        title: article.title,
        content: article.description || article.content || 'No description available',
        body: article.description,
        source: {
          title: article.source?.name || 'Unknown Source'
        },
        published_at: article.publishedAt,
        url: article.url,
        urlToImage: article.urlToImage,
        author: article.author,
        sentiment: this.analyzeSentiment(article.title + ' ' + (article.description || '')),
        category: 'crypto'
      }));
  }

  /**
   * Simple sentiment analysis based on keywords
   * @param {string} text - Text to analyze
   * @returns {string} Sentiment: 'positive', 'negative', or 'neutral'
   */
  analyzeSentiment(text) {
    if (!text) return 'neutral';
    
    const lowerText = text.toLowerCase();
    const { positive: positiveWords, negative: negativeWords } = this.config.sentimentKeywords;
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Handle API errors with user-friendly messages
   * @param {Error} error - The error object
   */
  handleAPIError(error) {
    const errorMessages = {
      'Invalid API key': 'API authentication failed. Please check your API key.',
      'API rate limit exceeded': 'Too many requests. Please try again later.',
      'News API server error': 'News service is temporarily unavailable.',
      'No internet connection': 'No internet connection. Please check your network.',
    };

    const message = errorMessages[error.message] || `Error: ${error.message}`;
    this.showToast(message, 'error');
    console.error('[News API Error]:', error);
  }

  /**
   * Generate demo cryptocurrency news data
   * @returns {Array} Array of demo news articles
   */
  getDemoNews() {
    const now = new Date();
    return [
      { 
        title: 'Bitcoin Reaches New All-Time High Amid Institutional Adoption', 
        content: 'Bitcoin surpasses previous records as major institutions continue to add BTC to their portfolios. Market analysts predict further growth driven by increasing mainstream acceptance.', 
        source: { title: 'CryptoNews Today' }, 
        published_at: now.toISOString(), 
        url: '#', 
        category: 'market',
        sentiment: 'positive'
      },
      { 
        title: 'Ethereum 2.0 Upgrade Successfully Deployed', 
        content: 'The highly anticipated Ethereum 2.0 upgrade has been successfully implemented, bringing significant improvements in scalability and drastically reducing transaction fees for users.', 
        source: { title: 'ETH Daily' }, 
        published_at: new Date(now - 3600000).toISOString(), 
        url: '#', 
        category: 'technology',
        sentiment: 'positive'
      },
      { 
        title: 'Major Countries Announce New Cryptocurrency Regulations', 
        content: 'Government officials from multiple countries have introduced a comprehensive framework for digital asset oversight, aiming to balance innovation with consumer protection.', 
        source: { title: 'RegWatch Global' }, 
        published_at: new Date(now - 7200000).toISOString(), 
        url: '#', 
        category: 'regulation',
        sentiment: 'neutral'
      },
      { 
        title: 'Market Analysis: Bitcoin Price Correction Expected', 
        content: 'Leading market analysts predict a short-term correction in Bitcoin price following recent highs, advising traders to exercise caution in the coming weeks.', 
        source: { title: 'CryptoAnalyst Pro' }, 
        published_at: new Date(now - 10800000).toISOString(), 
        url: '#', 
        category: 'analysis',
        sentiment: 'negative'
      },
      { 
        title: 'DeFi Platform Launches Revolutionary Yield Farming Protocol', 
        content: 'A new decentralized finance platform has unveiled an innovative yield farming protocol promising higher returns with enhanced security features.', 
        source: { title: 'DeFi Insider' }, 
        published_at: new Date(now - 14400000).toISOString(), 
        url: '#', 
        category: 'defi',
        sentiment: 'positive'
      }
    ];
  }

  /**
   * Apply all current filters to articles
   */
  applyFilters() {
    let filtered = [...this.allArticles];
    
    // Keyword search (client-side)
    if (this.currentFilters.keyword) {
      const keyword = this.currentFilters.keyword.toLowerCase();
      filtered = filtered.filter(article =>
        article.title?.toLowerCase().includes(keyword) ||
        article.content?.toLowerCase().includes(keyword) ||
        article.body?.toLowerCase().includes(keyword)
      );
    }
    
    // Source filter (client-side as backup)
    if (this.currentFilters.source) {
      filtered = filtered.filter(article => {
        const sourceTitle = article.source?.title || article.source || '';
        return sourceTitle === this.currentFilters.source;
      });
    }
    
    // Sentiment filter (client-side as backup)
    if (this.currentFilters.sentiment) {
      filtered = filtered.filter(article =>
        article.sentiment === this.currentFilters.sentiment
      );
    }
    
    this.articles = filtered;
    this.renderNews();
    this.updateStats();
  }

  /**
   * Populate source dropdown with available sources
   */
  populateSourceDropdown() {
    const sourceSelect = document.getElementById('source-select');
    if (!sourceSelect) return;
    
    const sources = new Set();
    this.allArticles.forEach(article => {
      const source = article.source?.title || article.source;
      if (source) sources.add(source);
    });
    
    const currentValue = sourceSelect.value;
    sourceSelect.innerHTML = '<option value="">All Sources</option>';
    
    Array.from(sources).sort().forEach(source => {
      const option = document.createElement('option');
      option.value = source;
      option.textContent = source;
      sourceSelect.appendChild(option);
    });
    
    if (currentValue) {
      sourceSelect.value = currentValue;
    }
  }

  async summarizeNews() {
    this.showToast('AI summarization coming soon!', 'info');
  }

  /**
   * Update statistics display
   */
  updateStats() {
    const stats = {
      total: this.articles.length,
      positive: 0,
      neutral: 0,
      negative: 0
    };
    
    this.articles.forEach(article => {
      if (article.sentiment === 'positive') stats.positive++;
      else if (article.sentiment === 'negative') stats.negative++;
      else stats.neutral++;
    });
    
    const totalEl = document.getElementById('total-articles');
    if (totalEl) totalEl.textContent = stats.total;
    
    const positiveEl = document.getElementById('positive-count');
    if (positiveEl) positiveEl.textContent = stats.positive;
    
    const neutralEl = document.getElementById('neutral-count');
    if (neutralEl) neutralEl.textContent = stats.neutral;
    
    const negativeEl = document.getElementById('negative-count');
    if (negativeEl) negativeEl.textContent = stats.negative;
  }

  /**
   * Render news articles to the DOM with enhanced formatting
   */
  renderNews() {
    const container = document.getElementById('news-container') || document.getElementById('news-grid') || document.getElementById('news-list');
    if (!container) {
      console.error('[News] Container not found');
      return;
    }
    
    if (this.articles.length === 0) {
      container.innerHTML = `
        <div class="empty-state glass-card">
          <div class="empty-icon">📰</div>
          <h3>No news articles found</h3>
          <p>No articles match your current filters. Try adjusting your search or filters.</p>
          <button class="btn-gradient" onclick="window.newsPage.loadNews(true)">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Reload News
          </button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.articles.map((article, index) => {
      const sentimentBadge = article.sentiment ? 
        `<span class="sentiment-badge sentiment-${article.sentiment}">${article.sentiment}</span>` : '';
      
      const imageSection = article.urlToImage ? `
        <div class="news-image-container">
          <img src="${this.escapeHtml(article.urlToImage)}" 
               alt="${this.escapeHtml(article.title)}" 
               class="news-image"
               loading="lazy"
               onerror="this.style.display='none'">
        </div>
      ` : '';

      const author = article.author ? `
        <span class="news-author" title="Author">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          ${this.escapeHtml(article.author)}
        </span>
      ` : '';
      
      return `
      <div class="news-card glass-card" style="animation-delay: ${index * 0.05}s">
        ${imageSection}
        <div class="news-content">
          <div class="news-header">
            <h3 class="news-title">${this.escapeHtml(article.title || 'Crypto News Update')}</h3>
            <span class="news-time">${this.formatTime(article.published_at || article.created_at)}</span>
          </div>
          <p class="news-body">${this.escapeHtml(article.content || article.body || 'Latest cryptocurrency market news and updates.')}</p>
          <div class="news-footer">
            <div class="news-meta">
              <span class="news-source">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path></svg>
                ${this.escapeHtml(article.source?.title || article.source || 'CryptoNews')}
              </span>
              ${author}
              ${sentimentBadge}
            </div>
            ${article.url && article.url !== '#' ? `
              <a href="${this.escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" class="news-link">
                Read Full Article →
              </a>
            ` : ''}
          </div>
        </div>
      </div>
      `;
    }).join('');
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  formatTime(dateStr) {
    if (!dateStr) return 'Recently';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  }

  updateTimestamp() {
    const el = document.getElementById('last-update');
    if (el) {
      el.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
    }
  }

  showToast(message, type = 'info') {
    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b'
    };
    
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      background: ${colors[type] || colors.info};
      color: white;
      font-weight: 500;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

const newsPage = new NewsPage();
window.newsPage = newsPage; // Make available globally for cleanup
newsPage.init();

export default newsPage;
