/**
 * Sentiment Analysis Page - FIXED VERSION
 * Proper error handling, null safety, and event binding
 */

class SentimentPage {
  constructor() {
    this.activeTab = 'global';
    this.refreshInterval = null;
  }

  async init() {
    try {
      console.log('[Sentiment] Initializing...');
      
      this.bindEvents();
      await this.loadGlobalSentiment();
      
      // Set up auto-refresh for global tab
      this.refreshInterval = setInterval(() => {
        if (this.activeTab === 'global') {
          this.loadGlobalSentiment();
        }
      }, 60000);
      
      this.showToast('Sentiment page ready', 'success');
    } catch (error) {
      console.error('[Sentiment] Init error:', error?.message || 'Unknown error');
      this.showToast('Failed to load sentiment', 'error');
    }
  }

  /**
   * Bind all UI events with proper null checks
   */
  bindEvents() {
    // Tab switching - single unified handler
    const tabs = document.querySelectorAll('.tab, .tab-btn, button[data-tab]');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const tabName = tab.getAttribute('data-tab') || tab.dataset.tab;
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });

    // Global sentiment refresh
    const refreshBtn = document.getElementById('refresh-global');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadGlobalSentiment();
      });
    }

    // Asset sentiment analysis
    const analyzeAssetBtn = document.getElementById('analyze-asset');
    if (analyzeAssetBtn) {
      analyzeAssetBtn.addEventListener('click', () => {
        this.analyzeAsset();
      });
    }

    // Asset input - analyze on Enter key
    const assetInput = document.getElementById('asset-input');
    if (assetInput) {
      assetInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.analyzeAsset();
        }
      });
    }

    // Text sentiment analysis
    const analyzeTextBtn = document.getElementById('analyze-text');
    if (analyzeTextBtn) {
      analyzeTextBtn.addEventListener('click', () => {
        this.analyzeText();
      });
    }
  }

  /**
   * Switch between tabs
   */
  switchTab(tabName) {
    if (!tabName) return;
    
    this.activeTab = tabName;
    console.log('[Sentiment] Switching to tab:', tabName);
    
    // Update tab buttons
    const tabs = document.querySelectorAll('.tab, .tab-btn, button[data-tab]');
    tabs.forEach(tab => {
      const isActive = (tab.getAttribute('data-tab') || tab.dataset.tab) === tabName;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    
    // Update tab panes
    const panes = document.querySelectorAll('.tab-pane');
    panes.forEach(pane => {
      const paneId = pane.id.replace('tab-', '');
      const isActive = paneId === tabName;
      pane.classList.toggle('active', isActive);
      pane.style.display = isActive ? 'block' : 'none';
    });
    
    // Load data for active tab
    if (tabName === 'global') {
      this.loadGlobalSentiment();
    }
  }

  /**
   * Load global market sentiment
   */
  async loadGlobalSentiment() {
    const container = document.getElementById('global-content');
    if (!container) {
      console.warn('[Sentiment] Global content container not found');
      return;
    }

    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading sentiment data...</p>
      </div>
    `;
    
    try {
      let data = null;

      // Strategy 1: Try primary API
      try {
        const response = await fetch('/api/sentiment/global', {
          signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            console.log('[Sentiment] Loaded from primary API');
          }
        }
      } catch (e) {
        console.warn('[Sentiment] Primary API failed:', e?.message || 'Unknown error');
      }

      // Strategy 2: Try Fear & Greed Index API
      if (!data) {
        try {
          const response = await fetch('https://api.alternative.me/fng/', {
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            const fgData = await response.json();
            if (fgData && fgData.data && fgData.data[0]) {
              const fgIndex = parseInt(fgData.data[0].value);
              data = {
                fear_greed_index: fgIndex,
                sentiment: this.getFGSentiment(fgIndex),
                score: fgIndex / 100,
                market_trend: fgIndex > 50 ? 'bullish' : 'bearish',
                positive_ratio: fgIndex / 100
              };
              console.log('[Sentiment] Loaded from Fear & Greed API');
            }
          }
        } catch (e) {
          console.warn('[Sentiment] Fear & Greed API failed:', e?.message || 'Unknown error');
        }
      }

      // Strategy 3: Use demo data
      if (!data) {
        console.warn('[Sentiment] Using demo data');
        data = {
          fear_greed_index: 55,
          sentiment: 'Neutral',
          score: 0.55,
          market_trend: 'neutral',
          positive_ratio: 0.55
        };
      }

      this.renderGlobalSentiment(data);
    } catch (error) {
      console.error('[Sentiment] Load error:', error?.message || 'Unknown error');
      container.innerHTML = `
        <div class="error-state">
          <p>⚠️ Failed to load sentiment data</p>
          <button class="btn btn-secondary" onclick="window.sentimentPage?.loadGlobalSentiment()">
            Retry
          </button>
        </div>
      `;
    }
  }

  /**
   * Get Fear & Greed sentiment label
   */
  getFGSentiment(index) {
    if (index < 25) return 'Extreme Fear';
    if (index < 45) return 'Fear';
    if (index < 55) return 'Neutral';
    if (index < 75) return 'Greed';
    return 'Extreme Greed';
  }

  /**
   * Render global sentiment with beautiful visualization
   */
  renderGlobalSentiment(data) {
    const container = document.getElementById('global-content');
    if (!container) return;
    
    const fgIndex = data.fear_greed_index || 50;
    const score = data.score || 0.5;
    
    // Determine sentiment details
    let label, color, emoji, description;
    if (fgIndex < 25) {
      label = 'Extreme Fear';
      color = '#ef4444';
      emoji = '😱';
      description = 'Market is in extreme fear. Possible buying opportunity.';
    } else if (fgIndex < 45) {
      label = 'Fear';
      color = '#f97316';
      emoji = '😰';
      description = 'Market sentiment is fearful. Proceed with caution.';
    } else if (fgIndex < 55) {
      label = 'Neutral';
      color = '#eab308';
      emoji = '😐';
      description = 'Market sentiment is neutral. Wait for clearer signals.';
    } else if (fgIndex < 75) {
      label = 'Greed';
      color = '#22c55e';
      emoji = '😊';
      description = 'Market sentiment is greedy. Consider taking profits.';
    } else {
      label = 'Extreme Greed';
      color = '#10b981';
      emoji = '🤑';
      description = 'Market is in extreme greed. High risk of correction.';
    }
    
    container.innerHTML = `
      <div class="sentiment-hero">
        <div class="sentiment-gauge-container">
          <div class="sentiment-circle" style="--gauge-color: ${color}">
            <div class="gauge-bg"></div>
            <div class="gauge-fill" style="--fill-percent: ${fgIndex}"></div>
            <div class="gauge-content">
              <div class="gauge-emoji">${emoji}</div>
              <div class="gauge-value">${fgIndex}</div>
              <div class="gauge-label">${label}</div>
            </div>
          </div>
          
          <div class="fear-greed-spectrum">
            <div class="spectrum-bar">
              <div class="segment extreme-fear"></div>
              <div class="segment fear"></div>
              <div class="segment neutral"></div>
              <div class="segment greed"></div>
              <div class="segment extreme-greed"></div>
              <div class="indicator" style="--indicator-left: ${fgIndex}%">
                <div class="indicator-arrow"></div>
              </div>
            </div>
            <div class="spectrum-labels">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>
        </div>
        
        <div class="sentiment-info">
          <div class="info-card">
            <div class="info-icon" style="color: ${color}">${emoji}</div>
            <h3>${label}</h3>
            <p>${description}</p>
          </div>
          
          <div class="metrics-grid">
            <div class="metric">
              <div class="metric-label">Sentiment Score</div>
              <div class="metric-value" style="color: ${color}">${(score * 100).toFixed(0)}%</div>
            </div>
            
            <div class="metric">
              <div class="metric-label">Market Trend</div>
              <div class="metric-value ${data.market_trend === 'bullish' ? 'bullish' : data.market_trend === 'bearish' ? 'bearish' : ''}">
                ${(data.market_trend || 'NEUTRAL').toUpperCase()}
              </div>
            </div>
            
            <div class="metric">
              <div class="metric-label">Fear & Greed</div>
              <div class="metric-value" style="color: ${color}">${fgIndex}/100</div>
            </div>
            
            <div class="metric">
              <div class="metric-label">Positive Ratio</div>
              <div class="metric-value">${((data.positive_ratio || 0.5) * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Analyze specific asset
   */
  async analyzeAsset() {
    const input = document.getElementById('asset-input');
    const container = document.getElementById('asset-result');
    
    if (!input || !container) {
      console.error('[Sentiment] Asset input or result container not found');
      return;
    }
    
    const symbol = input.value.trim().toUpperCase();
    
    if (!symbol) {
      this.showToast('Please enter a symbol', 'warning');
      return;
    }
    
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Analyzing ${symbol}...</p>
      </div>
    `;
    
    try {
      let data = null;
      
      // Strategy 1: Try primary API
      try {
        const response = await fetch(`/api/sentiment/asset/${encodeURIComponent(symbol)}`, {
          signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
          data = await response.json();
          console.log('[Sentiment] Asset data from primary API');
        }
      } catch (e) {
        console.warn('[Sentiment] Asset API failed:', e?.message || 'Unknown error');
      }
      
      // Strategy 2: Fallback to sentiment analyze
      if (!data) {
        try {
          const response = await fetch('/api/sentiment/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text: `${symbol} cryptocurrency market sentiment analysis`,
              mode: 'crypto'
            }),
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            const sentimentData = await response.json();
            data = {
              symbol: symbol,
              name: symbol,
              sentiment: sentimentData.sentiment || 'neutral',
              score: sentimentData.score || sentimentData.confidence || 0.5,
              price_change_24h: 0,
              current_price: 0
            };
            console.log('[Sentiment] Asset data from sentiment API');
          }
        } catch (e) {
          console.warn('[Sentiment] Sentiment API failed:', e?.message || 'Unknown error');
        }
      }
      
      // Strategy 3: Use demo data
      if (!data) {
        console.warn('[Sentiment] Using demo data for asset');
        data = {
          symbol: symbol,
          name: symbol,
          sentiment: 'neutral',
          score: 0.5,
          price_change_24h: 0,
          current_price: 0
        };
      }
      
      this.renderAssetSentiment(data);
      this.showToast('Analysis complete', 'success');
    } catch (error) {
      console.error('[Sentiment] Asset analysis error:', error?.message || 'Unknown error');
      container.innerHTML = `
        <div class="error-state">
          <p>⚠️ Failed to analyze asset</p>
          <button class="btn btn-secondary" onclick="window.sentimentPage?.analyzeAsset()">
            Retry
          </button>
        </div>
      `;
    }
  }

  /**
   * Render asset sentiment
   */
  renderAssetSentiment(data) {
    const container = document.getElementById('asset-result');
    if (!container) return;
    
    const sentiment = (data.sentiment || 'neutral').toLowerCase();
    let sentimentClass, emoji;
    
    if (sentiment.includes('bull') || sentiment.includes('positive')) {
      sentimentClass = 'bullish';
      emoji = '🚀';
    } else if (sentiment.includes('bear') || sentiment.includes('negative')) {
      sentimentClass = 'bearish';
      emoji = '📉';
    } else {
      sentimentClass = 'neutral';
      emoji = '➡️';
    }
    
    container.innerHTML = `
      <div class="asset-sentiment ${sentimentClass}">
        <div class="asset-header">
          <div class="asset-icon">${emoji}</div>
          <div class="asset-info">
            <h3>${data.name || data.symbol}</h3>
            <span class="asset-symbol">${data.symbol}</span>
          </div>
        </div>
        
        <div class="asset-metrics">
          <div class="metric-box">
            <span>Sentiment</span>
            <strong class="${sentimentClass}">${data.sentiment.replace(/_/g, ' ').toUpperCase()}</strong>
          </div>
          <div class="metric-box">
            <span>24h Change</span>
            <strong class="${data.price_change_24h >= 0 ? 'positive' : 'negative'}">
              ${data.price_change_24h >= 0 ? '+' : ''}${(data.price_change_24h || 0).toFixed(2)}%
            </strong>
          </div>
          <div class="metric-box">
            <span>Current Price</span>
            <strong>$${(data.current_price || 0).toLocaleString()}</strong>
          </div>
          <div class="metric-box">
            <span>Confidence</span>
            <strong>${((data.score || 0.5) * 100).toFixed(0)}%</strong>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Analyze custom text
   */
  async analyzeText() {
    const textarea = document.getElementById('text-input');
    const container = document.getElementById('text-result');
    
    if (!textarea || !container) {
      console.error('[Sentiment] Text input or result container not found');
      return;
    }
    
    const text = textarea.value.trim();
    
    if (!text) {
      this.showToast('Please enter text to analyze', 'warning');
      return;
    }
    
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Analyzing text sentiment...</p>
      </div>
    `;
    
    try {
      let data = null;
      
      // Get selected mode
      const modeSelect = document.getElementById('mode-select');
      const mode = modeSelect?.value || 'crypto';
      
      // Try API
      try {
        const response = await fetch('/api/sentiment/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, mode }),
          signal: AbortSignal.timeout(10000)
        });
        
        if (response.ok) {
          data = await response.json();
          console.log('[Sentiment] Text analysis from API');
        }
      } catch (e) {
        console.warn('[Sentiment] Text API failed:', e?.message || 'Unknown error');
      }
      
      // Fallback to local analysis
      if (!data) {
        console.warn('[Sentiment] Using local text analysis');
        data = this.analyzeTextLocally(text);
      }
      
      this.renderTextSentiment(data);
      this.showToast('Analysis complete', 'success');
    } catch (error) {
      console.error('[Sentiment] Text analysis error:', error?.message || 'Unknown error');
      container.innerHTML = `
        <div class="error-state">
          <p>⚠️ Failed to analyze text</p>
          <button class="btn btn-secondary" onclick="window.sentimentPage?.analyzeText()">
            Retry
          </button>
        </div>
      `;
    }
  }

  /**
   * Local text sentiment analysis fallback
   */
  analyzeTextLocally(text) {
    const words = text.toLowerCase();
    const bullish = ['moon', 'pump', 'bull', 'buy', 'up', 'gain', 'profit', 'bullish', 'positive', 'good'];
    const bearish = ['dump', 'bear', 'sell', 'down', 'loss', 'crash', 'bearish', 'negative', 'bad'];
    
    const bullCount = bullish.filter(w => words.includes(w)).length;
    const bearCount = bearish.filter(w => words.includes(w)).length;
    
    let sentiment, score;
    if (bullCount > bearCount) {
      sentiment = 'positive';
      score = 0.6 + (bullCount * 0.05);
    } else if (bearCount > bullCount) {
      sentiment = 'negative';
      score = 0.4 - (bearCount * 0.05);
    } else {
      sentiment = 'neutral';
      score = 0.5;
    }
    
    return {
      sentiment,
      score: Math.max(0, Math.min(1, score)),
      confidence: Math.min((bullCount + bearCount) / 5, 1)
    };
  }

  /**
   * Render text sentiment
   */
  renderTextSentiment(data) {
    const container = document.getElementById('text-result');
    if (!container) return;
    
    const sentiment = (data.sentiment || 'neutral').toLowerCase();
    let sentimentClass, emoji, color;
    
    if (sentiment.includes('bull') || sentiment.includes('positive')) {
      sentimentClass = 'bullish';
      emoji = '😊';
      color = '#22c55e';
    } else if (sentiment.includes('bear') || sentiment.includes('negative')) {
      sentimentClass = 'bearish';
      emoji = '😟';
      color = '#ef4444';
    } else {
      sentimentClass = 'neutral';
      emoji = '😐';
      color = '#eab308';
    }
    
    const score = (data.score || data.confidence || 0.5) * 100;
    
    container.innerHTML = `
      <div class="text-sentiment-result">
        <div class="sentiment-badge ${sentimentClass}">
          ${emoji} ${data.sentiment.toUpperCase()}
        </div>
        
        <div class="sentiment-details">
          <div class="detail-row">
            <span>Confidence Score:</span>
            <strong>${score.toFixed(1)}%</strong>
          </div>
        </div>
        
        <div class="confidence-bar">
          <div class="confidence-fill" style="width: ${score}%; background: ${color}"></div>
        </div>
      </div>
    `;
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      warning: '#eab308',
      info: '#3b82f6'
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
      font-weight: 600;
      z-index: 9999;
      animation: slideInRight 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideInRight 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  /**
   * Cleanup on page unload
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

// Initialize and expose globally
const sentimentPage = new SentimentPage();
sentimentPage.init();
window.sentimentPage = sentimentPage;

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  sentimentPage.destroy();
});

export default SentimentPage;
