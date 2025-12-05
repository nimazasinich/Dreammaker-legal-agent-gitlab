/**
 * AI Analyst Page
 */

class AIAnalystPage {
  constructor() {
    this.currentSymbol = 'BTC';
    this.currentTimeframe = '1h';
  }

  async init() {
    try {
      console.log('[AIAnalyst] Initializing...');
      this.bindEvents();
      // Load model status immediately and retry if needed
      await this.loadModelStatus();
      // Retry after 2 seconds if no models loaded
      setTimeout(async () => {
        const statusIndicator = document.getElementById('model-status-indicator');
        if (statusIndicator) {
          const text = statusIndicator.textContent || '';
          if (text.includes('0 models') || text.includes('Loading')) {
            console.log('[AIAnalyst] Retrying model status load...');
            await this.loadModelStatus();
          }
        }
      }, 2000);
      console.log('[AIAnalyst] Ready');
    } catch (error) {
      console.error('[AIAnalyst] Init error:', error);
    }
  }
  
  /**
   * Load HuggingFace models status
   */
  async loadModelStatus() {
    try {
      const response = await fetch('/api/models/status', {
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const data = await response.json();
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
          // Clear existing options except default
          modelSelect.innerHTML = '<option value="default">Default (Best Available)</option>';
          
          // Add available models from various response formats
          let modelsToAdd = [];
          
          // Format 1: data.models.model_catalog
          if (data.models?.model_catalog) {
            Object.entries(data.models.model_catalog).forEach(([category, models]) => {
              if (Array.isArray(models)) {
                models.forEach(model => {
                  modelsToAdd.push({
                    value: model.id || model.name || model.model_id,
                    text: `${model.name || model.id || model.model_id} (${category})`
                  });
                });
              }
            });
          }
          
          // Format 2: data.models (array)
          if (Array.isArray(data.models)) {
            data.models.forEach(model => {
              modelsToAdd.push({
                value: model.id || model.name || model.model_id || model.key,
                text: `${model.name || model.id || model.model_id || model.key} (${model.category || 'AI'})`
              });
            });
          }
          
          // Format 3: data.model_catalog (direct)
          if (data.model_catalog) {
            Object.entries(data.model_catalog).forEach(([category, models]) => {
              if (Array.isArray(models)) {
                models.forEach(model => {
                  modelsToAdd.push({
                    value: model.id || model.name || model.model_id,
                    text: `${model.name || model.id || model.model_id} (${category})`
                  });
                });
              }
            });
          }
          
          // Add unique models to select
          const added = new Set();
          modelsToAdd.forEach(model => {
            if (!added.has(model.value)) {
              const option = document.createElement('option');
              option.value = model.value;
              option.textContent = model.text;
              modelSelect.appendChild(option);
              added.add(model.value);
            }
          });
        }
        
        // Update model status indicator
        const statusIndicator = document.getElementById('model-status-indicator');
        if (statusIndicator) {
          // Try multiple ways to get loaded count
          const loadedCount = data.models_loaded || 
                            data.models?.models_loaded || 
                            (Array.isArray(data.models) ? data.models.filter(m => m.loaded !== false).length : 0) ||
                            (data.models?.model_catalog ? Object.values(data.models.model_catalog).flat().length : 0) ||
                            0;
          
          statusIndicator.innerHTML = `
            <span class="status-dot ${loadedCount > 0 ? 'active' : 'inactive'}"></span>
            <span>${loadedCount} models loaded</span>
          `;
        }
      } else {
        // Update status to show error
        const statusIndicator = document.getElementById('model-status-indicator');
        if (statusIndicator) {
          statusIndicator.innerHTML = `
            <span class="status-dot inactive"></span>
            <span>Failed to load models</span>
          `;
        }
      }
    } catch (error) {
      console.warn('[AIAnalyst] Failed to load model status:', error);
      const statusIndicator = document.getElementById('model-status-indicator');
      if (statusIndicator) {
        statusIndicator.innerHTML = `
          <span class="status-dot inactive"></span>
          <span>Error loading models</span>
        `;
      }
    }
  }

  bindEvents() {
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.analyzeAsset());
    }

    const symbolInput = document.getElementById('symbol-input');
    if (symbolInput) {
      // Update on both change and input events
      symbolInput.addEventListener('change', (e) => {
        this.currentSymbol = (e.target.value || 'BTC').toUpperCase().trim();
      });
      symbolInput.addEventListener('input', (e) => {
        this.currentSymbol = (e.target.value || 'BTC').toUpperCase().trim();
      });
      // Set initial value
      this.currentSymbol = (symbolInput.value || 'BTC').toUpperCase().trim();
    }

    const timeframeInputs = document.querySelectorAll('input[name="timeframe"]');
    timeframeInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.currentTimeframe = e.target.value;
      });
    });
  }

  /**
   * Quick analyze for a specific symbol
   * @param {string} symbol - Cryptocurrency symbol
   */
  quickAnalyze(symbol) {
    const symbolInput = document.getElementById('symbol-input');
    if (symbolInput) {
      symbolInput.value = symbol;
      this.currentSymbol = symbol.toUpperCase();
    }
    // Trigger analysis
    this.analyzeAsset();
  }

  async analyzeAsset() {
    const resultsBody = document.getElementById('results-body');
    if (!resultsBody) return;

    // Get current symbol from input if available
    const symbolInput = document.getElementById('symbol-input');
    if (symbolInput) {
      this.currentSymbol = (symbolInput.value || this.currentSymbol || 'BTC').toUpperCase().trim();
    }

    resultsBody.innerHTML = '<div class="loading-spinner">Analyzing...</div>';

    try {
      let data = null;

      try {
        const response = await fetch('/api/ai/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: this.currentSymbol || 'BTC',
            timeframe: this.currentTimeframe || '1h'
          }),
          signal: AbortSignal.timeout(30000)
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          }
        }
      } catch (e) {
        console.warn('[AIAnalyst] /api/ai/decision unavailable, using fallback', e);
      }

      if (!data) {
        try {
          const sentimentRes = await fetch('/api/sentiment/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `${this.currentSymbol} market analysis for timeframe ${this.currentTimeframe}`,
              mode: 'crypto'
            })
          });

          if (sentimentRes.ok) {
            const contentType = sentimentRes.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const sentimentData = await sentimentRes.json();
              const sentiment = (sentimentData.sentiment || '').toLowerCase();
              let decision = 'HOLD';
              if (sentiment.includes('bull')) decision = 'BUY';
              if (sentiment.includes('bear')) decision = 'SELL';

              data = {
                decision,
                confidence: Math.round((sentimentData.confidence || 0.7) * 100),
                signals: {
                  trend: decision === 'BUY' ? 'bullish' : decision === 'SELL' ? 'bearish' : 'neutral',
                  momentum: 'Medium',
                  volume: 'Normal',
                  sentiment: sentimentData.sentiment || 'neutral'
                },
                reasoning: sentimentData.note || 'Derived from sentiment analysis.'
              };
            }
          }
        } catch (e) {
          console.warn('[AIAnalyst] Sentiment API also unavailable, using demo data', e);
        }
      }

      if (!data) {
        // NO MOCK DATA - Show error state
        resultsBody.innerHTML = `
          <div class="error-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3>API Unavailable</h3>
            <p>Unable to connect to AI analysis service. Please check:</p>
            <ul style="text-align: left; margin-top: 1rem;">
              <li>Backend server is running</li>
              <li>HuggingFace models are loaded</li>
              <li>API endpoint /api/ai/decision is accessible</li>
            </ul>
          </div>
        `;
        return;
      }

      // Fetch OHLCV data for chart (REAL DATA) - Use unified API
      let ohlcv = [];
      try {
        // Try unified OHLC API first
        let res = await fetch(`/api/market/ohlc?symbol=${encodeURIComponent(this.currentSymbol)}&interval=${encodeURIComponent(this.currentTimeframe)}&limit=100`, {
          signal: AbortSignal.timeout(10000)
        });
        
        // Fallback to legacy endpoint if unified API fails
        if (!res.ok) {
          res = await fetch(`/api/ohlcv?symbol=${encodeURIComponent(this.currentSymbol)}&timeframe=${encodeURIComponent(this.currentTimeframe)}&limit=100`, {
            signal: AbortSignal.timeout(10000)
          });
        }
        
        if (res.ok) {
          const json = await res.json();
          
          // Handle error responses
          if (json.success === false || json.error === true) {
            console.warn('[AIAnalyst] OHLCV error:', json.message || 'Unknown error');
          } else if (json.success && Array.isArray(json.data)) {
            // Validate data structure
            if (json.data.length > 0) {
              const firstCandle = json.data[0];
              if (firstCandle && (firstCandle.o !== undefined || firstCandle.open !== undefined)) {
                ohlcv = json.data;
              } else {
                console.warn('[AIAnalyst] Invalid OHLCV data structure');
              }
            }
          } else if (Array.isArray(json.data)) {
            // Fallback: data might be directly in response
            ohlcv = json.data;
          } else if (Array.isArray(json)) {
            // Direct array response
            ohlcv = json;
          }
        } else {
          console.warn(`[AIAnalyst] OHLCV request failed: HTTP ${res.status}`);
        }
      } catch (e) {
        console.warn('[AIAnalyst] OHLCV unavailable:', e.message);
      }

      this.renderAnalysis(data, ohlcv);
    } catch (error) {
      console.error('[AIAnalyst] Analysis error:', error);
      resultsBody.innerHTML = '<div class="error-state">⚠️ Failed to load analysis. API may be offline.</div>';
    }
  }

  async renderAnalysis(data, ohlcv = []) {
    const resultsBody = document.getElementById('results-body');
    if (!resultsBody) return;

    const decision = data.decision || 'HOLD';
    // Normalize confidence: if < 1, assume it's a decimal (0.9 = 90%), otherwise use as-is
    let confidence = data.confidence || 50;
    if (confidence < 1 && confidence > 0) {
      confidence = Math.round(confidence * 100);
    } else {
      confidence = Math.round(confidence);
    }
    // Ensure confidence is between 0-100
    confidence = Math.max(0, Math.min(100, confidence));
    const signals = data.signals || {};

    // Compute price targets and technical indicators from OHLCV (REAL DATA)
    const closes = Array.isArray(ohlcv) ? ohlcv.map(c => parseFloat(c.c || c.close || 0)).filter(v => v > 0) : [];
    const highs = Array.isArray(ohlcv) ? ohlcv.map(c => parseFloat(c.h || c.high || 0)).filter(v => v > 0) : [];
    const lows = Array.isArray(ohlcv) ? ohlcv.map(c => parseFloat(c.l || c.low || 0)).filter(v => v > 0) : [];
    const volumes = Array.isArray(ohlcv) ? ohlcv.map(c => parseFloat(c.v || c.volume || 0)).filter(v => v > 0) : [];
    
    const lastClose = closes.length > 0 ? closes[closes.length - 1] : null;
    
    // Better support/resistance calculation using pivot points
    const calculateSupportResistance = () => {
      if (closes.length < 20) return { support: null, resistance: null };
      
      // Use last 50 candles for better accuracy
      const recentHighs = highs.slice(-50);
      const recentLows = lows.slice(-50);
      const recentCloses = closes.slice(-50);
      
      // Find pivot highs (resistance) and pivot lows (support)
      const pivotHighs = [];
      const pivotLows = [];
      
      for (let i = 1; i < recentHighs.length - 1; i++) {
        if (recentHighs[i] > recentHighs[i-1] && recentHighs[i] > recentHighs[i+1]) {
          pivotHighs.push(recentHighs[i]);
        }
        if (recentLows[i] < recentLows[i-1] && recentLows[i] < recentLows[i+1]) {
          pivotLows.push(recentLows[i]);
        }
      }
      
      // Calculate support as average of recent pivot lows
      const support = pivotLows.length > 0 
        ? pivotLows.slice(-3).reduce((a, b) => a + b, 0) / Math.min(pivotLows.length, 3)
        : recentLows.length > 0 ? Math.min(...recentLows.slice(-20)) : null;
      
      // Calculate resistance as average of recent pivot highs
      const resistance = pivotHighs.length > 0
        ? pivotHighs.slice(-3).reduce((a, b) => a + b, 0) / Math.min(pivotHighs.length, 3)
        : recentHighs.length > 0 ? Math.max(...recentHighs.slice(-20)) : null;
      
      return { support, resistance };
    };
    
    const { support, resistance } = calculateSupportResistance();
    
    // Calculate RSI
    const calculateRSI = (prices, period = 14) => {
      if (prices.length < period + 1) return null;
      
      const deltas = [];
      for (let i = 1; i < prices.length; i++) {
        deltas.push(prices[i] - prices[i-1]);
      }
      
      const gains = deltas.slice(-period).filter(d => d > 0);
      const losses = deltas.slice(-period).filter(d => d < 0).map(d => Math.abs(d));
      
      const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
      const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;
      
      if (avgLoss === 0) return avgGain > 0 ? 100 : 50;
      
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    };
    
    const rsi = calculateRSI(closes);
    
    // Calculate Moving Averages
    const sma20 = closes.length >= 20 
      ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20 
      : null;
    const sma50 = closes.length >= 50 
      ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 
      : null;
    
    // Determine trend
    const trend = sma20 && sma50 
      ? (sma20 > sma50 ? 'bullish' : 'bearish')
      : (rsi ? (rsi > 50 ? 'bullish' : 'bearish') : 'neutral');
    
    // Calculate price change percentage
    const priceChange = closes.length >= 2 
      ? ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100 
      : 0;

    // Format numbers
    const formatPrice = (val) => val ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
    const formatPercent = (val) => val ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : '—';
    
    // Get SVG icons for bullish/bearish
    const bullishIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
    const bearishIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    const neutralIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    
    const trendIcon = trend === 'bullish' ? bullishIcon : trend === 'bearish' ? bearishIcon : neutralIcon;
    const decisionClass = decision === 'BUY' ? 'bullish' : decision === 'SELL' ? 'bearish' : 'neutral';
    
    resultsBody.innerHTML = `
      <div class="analysis-results">
        <!-- Main Decision Card -->
        <div class="decision-card ${decisionClass}">
          <div class="decision-header">
            <div class="symbol-info">
              <div class="symbol">${(this.currentSymbol || 'Asset').toUpperCase()}</div>
              <div class="price-info">
                <span class="current-price">${formatPrice(lastClose)}</span>
                <span class="price-change ${priceChange >= 0 ? 'positive' : 'negative'}">${formatPercent(priceChange)}</span>
              </div>
            </div>
            <div class="decision-badge ${decisionClass}">
              ${decisionClass === 'bullish' ? bullishIcon : decisionClass === 'bearish' ? bearishIcon : neutralIcon}
              <span>${decision}</span>
            </div>
          </div>
          <div class="confidence-meter">
            <div class="meter-label">Confidence Level</div>
            <div class="meter-bar">
              <div class="meter-fill ${decisionClass}" style="width:${confidence}%"></div>
            </div>
            <div class="meter-value">${confidence}%</div>
          </div>
        </div>

        <!-- Key Levels Card -->
        <div class="key-levels-card">
          <h4 class="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="M19 9l-5 5-4-4-3 3"></path></svg>
            Key Price Levels
          </h4>
          <div class="levels-grid">
            <div class="level-card support">
              <div class="level-icon">${bearishIcon}</div>
              <div class="level-info">
                <span class="level-label">Support Level</span>
                <strong class="level-value">${formatPrice(support)}</strong>
                ${support && lastClose ? `<span class="level-distance">${formatPercent(((lastClose - support) / support) * 100)} below</span>` : ''}
              </div>
            </div>
            <div class="level-card resistance">
              <div class="level-icon">${bullishIcon}</div>
              <div class="level-info">
                <span class="level-label">Resistance Level</span>
                <strong class="level-value">${formatPrice(resistance)}</strong>
                ${resistance && lastClose ? `<span class="level-distance">${formatPercent(((resistance - lastClose) / lastClose) * 100)} above</span>` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Technical Indicators -->
        <div class="analysis-section indicators-section">
          <h4 class="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            Technical Indicators
          </h4>
          <div class="indicators-grid">
            <div class="indicator-card">
              <div class="indicator-header">
                <span class="indicator-label">RSI (14)</span>
                <span class="indicator-value ${rsi ? (rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'normal') : ''}">
                  ${rsi ? rsi.toFixed(1) : '—'}
                </span>
              </div>
              ${rsi ? `<div class="indicator-bar"><div class="indicator-fill" style="width:${rsi}%"></div></div>` : ''}
              <div class="indicator-status">
                ${rsi ? (rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral') : 'N/A'}
              </div>
            </div>
            
            <div class="indicator-card">
              <div class="indicator-header">
                <span class="indicator-label">SMA 20</span>
                <span class="indicator-value">${formatPrice(sma20)}</span>
              </div>
              <div class="indicator-status">
                ${sma20 && lastClose ? (lastClose > sma20 ? 'Above' : 'Below') : 'N/A'}
              </div>
            </div>
            
            <div class="indicator-card">
              <div class="indicator-header">
                <span class="indicator-label">SMA 50</span>
                <span class="indicator-value">${formatPrice(sma50)}</span>
              </div>
              <div class="indicator-status">
                ${sma50 && lastClose ? (lastClose > sma50 ? 'Above' : 'Below') : 'N/A'}
              </div>
            </div>
            
            <div class="indicator-card trend-indicator">
              <div class="indicator-header">
                <span class="indicator-label">Trend</span>
                <span class="indicator-value ${trend}">${trendIcon} ${trend.charAt(0).toUpperCase() + trend.slice(1)}</span>
              </div>
              <div class="indicator-status">
                ${sma20 && sma50 ? (sma20 > sma50 ? 'Uptrend' : 'Downtrend') : 'Neutral'}
              </div>
            </div>
          </div>
        </div>

        <!-- Signals Overview -->
        <div class="analysis-section">
          <h4 class="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            Signals Overview
          </h4>
          <div class="signals-grid">
            <div class="signal-item ${signals.trend || trend || 'neutral'}">
              <span class="signal-icon">${trendIcon}</span>
              <span class="signal-label">Trend:</span>
              <span class="signal-value ${signals.trend || trend}">${signals.trend || trend || 'Neutral'}</span>
            </div>
            <div class="signal-item">
              <span class="signal-icon">${rsi ? (rsi > 50 ? bullishIcon : bearishIcon) : neutralIcon}</span>
              <span class="signal-label">Momentum:</span>
              <span class="signal-value">${signals.momentum || (rsi ? (rsi > 50 ? 'Bullish' : 'Bearish') : 'Medium')}</span>
            </div>
            <div class="signal-item">
              <span class="signal-icon">${neutralIcon}</span>
              <span class="signal-label">Volume:</span>
              <span class="signal-value">${signals.volume || 'Normal'}</span>
            </div>
            <div class="signal-item">
              <span class="signal-icon">${signals.sentiment === 'bullish' ? bullishIcon : signals.sentiment === 'bearish' ? bearishIcon : neutralIcon}</span>
              <span class="signal-label">Sentiment:</span>
              <span class="signal-value ${signals.sentiment}">${signals.sentiment || 'Neutral'}</span>
            </div>
          </div>
        </div>

        <div class="charts-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); margin-top: var(--space-4);">
          <!-- Price Chart -->
          <div class="analysis-section">
            <h4>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"></path><path d="M19 9l-5 5-4-4-3 3"></path></svg>
              Price Chart
            </h4>
            <div style="height:250px; position: relative;">
              <canvas id="sparkline-chart"></canvas>
            </div>
            <div class="price-targets" style="margin-top: var(--space-2); display: flex; gap: var(--space-2);">
              <div class="target primary"><span>Last</span><strong>${lastClose ? lastClose.toLocaleString() : '—'}</strong></div>
              <div class="target support"><span>Support</span><strong>${support ? support.toLocaleString() : '—'}</strong></div>
              <div class="target resistance"><span>Resistance</span><strong>${resistance ? resistance.toLocaleString() : '—'}</strong></div>
            </div>
          </div>

          <!-- Volume Chart -->
          <div class="analysis-section">
            <h4>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              Volume Analysis
            </h4>
            <div style="height:250px; position: relative;">
              <canvas id="volume-chart"></canvas>
            </div>
          </div>

          <!-- Trend/Momentum Chart -->
          <div class="analysis-section">
            <h4>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              Trend & Momentum
            </h4>
            <div style="height:250px; position: relative;">
              <canvas id="trend-chart"></canvas>
            </div>
          </div>

          <!-- Sentiment Chart -->
          <div class="analysis-section">
            <h4>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              Market Sentiment
            </h4>
            <div style="height:250px; position: relative;">
              <canvas id="sentiment-chart"></canvas>
            </div>
          </div>
        </div>

        <div class="analysis-section">
          <h4>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            Analysis Reasoning
          </h4>
          <p>${data.reasoning || 'Based on current market conditions and technical indicators.'}</p>
        </div>
      </div>
    `;

    // Render all 4 charts with Chart.js (REAL DATA)
    if (Array.isArray(ohlcv) && ohlcv.length > 0) {
      try {
        // Load Chart.js
        if (!window.Chart) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        
        // Format data
        const labels = ohlcv.map(c => {
          const t = c.t || c.timestamp || c.openTime;
          return new Date(typeof t === 'number' ? t : Date.parse(t)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        });
        const closes = ohlcv.map(c => parseFloat(c.c || c.close || 0));
        const highs = ohlcv.map(c => parseFloat(c.h || c.high || 0));
        const lows = ohlcv.map(c => parseFloat(c.l || c.low || 0));
        const volumes = ohlcv.map(c => parseFloat(c.v || c.volume || 0));
        
        // Calculate trend (price change percentage)
        const priceChanges = closes.map((close, i) => {
          if (i === 0) return 0;
          return ((close - closes[i - 1]) / closes[i - 1]) * 100;
        });
        
        // Calculate momentum (RSI-like indicator)
        const momentum = closes.map((close, i) => {
          if (i < 14) return 50; // Default neutral
          const period = closes.slice(i - 14, i);
          const gains = period.filter((p, idx) => idx > 0 && p > period[idx - 1]).length;
          const losses = period.filter((p, idx) => idx > 0 && p < period[idx - 1]).length;
          return gains > losses ? 50 + (gains / 14) * 50 : 50 - (losses / 14) * 50;
        });
        
        // Sentiment data (based on price action and volume)
        const sentimentData = closes.map((close, i) => {
          if (i === 0) return 50;
          const priceChange = priceChanges[i];
          const volumeRatio = volumes[i] / (volumes.slice(Math.max(0, i - 10), i).reduce((a, b) => a + b, 1) / Math.min(10, i));
          return Math.min(100, Math.max(0, 50 + priceChange * 2 + (volumeRatio > 1 ? 10 : -10)));
        });
        
        const chartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: 'var(--text-strong)',
                usePointStyle: true,
                padding: 8,
                font: { size: 11 }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1
            }
          },
          scales: {
            x: {
              display: true,
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: {
                color: 'var(--text-subtle)',
                maxRotation: 45,
                minRotation: 45,
                font: { size: 10 }
              }
            },
            y: {
              display: true,
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: {
                color: 'var(--text-subtle)',
                font: { size: 10 }
              }
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        };
        
        // 1. Price Chart
        const priceCtx = document.getElementById('sparkline-chart');
        if (priceCtx) {
          if (this.priceChart) this.priceChart.destroy();
          this.priceChart = new Chart(priceCtx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: 'Close',
                data: closes,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                borderWidth: 2
              }, {
                label: 'High',
                data: highs,
                borderColor: 'rgba(34, 197, 94, 0.3)',
                backgroundColor: 'transparent',
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 1,
                borderDash: [5, 5]
              }, {
                label: 'Low',
                data: lows,
                borderColor: 'rgba(239, 68, 68, 0.3)',
                backgroundColor: 'transparent',
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 1,
                borderDash: [5, 5]
              }]
            },
            options: {
              ...chartOptions,
              scales: {
                ...chartOptions.scales,
                y: {
                  ...chartOptions.scales.y,
                  ticks: {
                    ...chartOptions.scales.y.ticks,
                    callback: function(value) {
                      return '$' + value.toLocaleString();
                    }
                  }
                }
              }
            }
          });
        }
        
        // 2. Volume Chart
        const volumeCtx = document.getElementById('volume-chart');
        if (volumeCtx) {
          if (this.volumeChart) this.volumeChart.destroy();
          this.volumeChart = new Chart(volumeCtx, {
            type: 'bar',
            data: {
              labels: labels,
              datasets: [{
                label: 'Volume',
                data: volumes,
                backgroundColor: volumes.map((v, i) => {
                  const change = i > 0 ? (closes[i] - closes[i - 1]) / closes[i - 1] : 0;
                  return change >= 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)';
                }),
                borderColor: volumes.map((v, i) => {
                  const change = i > 0 ? (closes[i] - closes[i - 1]) / closes[i - 1] : 0;
                  return change >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)';
                }),
                borderWidth: 1
              }]
            },
            options: chartOptions
          });
        }
        
        // 3. Trend & Momentum Chart
        const trendCtx = document.getElementById('trend-chart');
        if (trendCtx) {
          if (this.trendChart) this.trendChart.destroy();
          this.trendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: 'Price Change %',
                data: priceChanges,
                borderColor: 'rgb(139, 92, 246)',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                borderWidth: 2,
                yAxisID: 'y'
              }, {
                label: 'Momentum',
                data: momentum,
                borderColor: 'rgb(251, 146, 60)',
                backgroundColor: 'rgba(251, 146, 60, 0.1)',
                tension: 0.4,
                fill: false,
                pointRadius: 0,
                borderWidth: 2,
                yAxisID: 'y1'
              }]
            },
            options: {
              ...chartOptions,
              scales: {
                ...chartOptions.scales,
                y: {
                  ...chartOptions.scales.y,
                  position: 'left',
                  ticks: {
                    ...chartOptions.scales.y.ticks,
                    callback: function(value) {
                      return value.toFixed(2) + '%';
                    }
                  }
                },
                y1: {
                  display: true,
                  position: 'right',
                  grid: { drawOnChartArea: false },
                  ticks: {
                    color: 'var(--text-subtle)',
                    font: { size: 10 },
                    callback: function(value) {
                      return value.toFixed(0);
                    }
                  }
                }
              }
            }
          });
        }
        
        // 4. Sentiment Chart
        const sentimentCtx = document.getElementById('sentiment-chart');
        if (sentimentCtx) {
          if (this.sentimentChart) this.sentimentChart.destroy();
          this.sentimentChart = new Chart(sentimentCtx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: 'Sentiment Score',
                data: sentimentData,
                borderColor: 'rgb(236, 72, 153)',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                borderWidth: 2
              }]
            },
            options: {
              ...chartOptions,
              scales: {
                ...chartOptions.scales,
                y: {
                  ...chartOptions.scales.y,
                  min: 0,
                  max: 100,
                  ticks: {
                    ...chartOptions.scales.y.ticks,
                    callback: function(value) {
                      if (value === 0) return 'Bearish';
                      if (value === 50) return 'Neutral';
                      if (value === 100) return 'Bullish';
                      return value;
                    }
                  }
                }
              }
            }
          });
        }
      } catch (e) {
        console.error('[AIAnalyst] Failed to render charts:', e);
        ['sparkline-chart', 'volume-chart', 'trend-chart', 'sentiment-chart'].forEach(id => {
          const container = document.getElementById(id)?.parentElement;
          if (container) {
            container.innerHTML = '<div class="error-state">Chart rendering failed</div>';
          }
        });
      }
    } else {
      ['sparkline-chart', 'volume-chart', 'trend-chart', 'sentiment-chart'].forEach(id => {
        const container = document.getElementById(id)?.parentElement;
        if (container) {
          container.innerHTML = '<div class="empty-state">No data available</div>';
        }
      });
    }
  }
}

export default AIAnalystPage;
