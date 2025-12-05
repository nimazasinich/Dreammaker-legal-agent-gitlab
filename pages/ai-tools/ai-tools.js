/**
 * AI Tools Page - Comprehensive AI Analysis Suite
 */

class AIToolsPage {
  constructor() {
    this.history = this.loadHistory();
    this.currentTab = 'sentiment';
    this.init();
  }

  /**
   * Initialize the page
   */
  init() {
    this.setupTabs();
    this.setupEventListeners();
    this.loadModelStatus();
    this.updateStats();
    this.renderHistory();
  }

  /**
   * Setup tab navigation
   */
  setupTabs() {
    const tabs = document.querySelectorAll('#ai-tools-tabs .tab');
    const panes = document.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active pane
        panes.forEach(p => p.classList.remove('active'));
        const targetPane = document.getElementById(`tab-${targetTab}`);
        if (targetPane) {
          targetPane.classList.add('active');
          this.currentTab = targetTab;
        }
      });
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Sentiment
    document.getElementById('analyze-sentiment-btn')?.addEventListener('click', () => this.analyzeSentiment());
    
    // Summarize
    document.getElementById('summarize-btn')?.addEventListener('click', () => this.summarizeText());
    
    // News
    document.getElementById('analyze-news-btn')?.addEventListener('click', () => this.analyzeNews());
    
    // Trading
    document.getElementById('get-trading-decision-btn')?.addEventListener('click', () => this.getTradingDecision());
    
    // Batch
    document.getElementById('process-batch-btn')?.addEventListener('click', () => this.processBatch());
    
    // History
    document.getElementById('clear-history-btn')?.addEventListener('click', () => this.clearHistory());
    document.getElementById('export-history-btn')?.addEventListener('click', () => this.exportHistory());
    
    // Model Status
    document.getElementById('refresh-status-btn')?.addEventListener('click', () => this.loadModelStatus());
    
    // Refresh All
    document.getElementById('refresh-all-btn')?.addEventListener('click', () => {
      this.loadModelStatus();
      this.updateStats();
    });
  }

  /**
   * Update statistics cards - REAL DATA from API
   */
  async updateStats() {
    try {
      const [statusRes, resourcesRes] = await Promise.allSettled([
        fetch('/api/models/status', { signal: AbortSignal.timeout(10000) }),
        fetch('/api/resources/summary', { signal: AbortSignal.timeout(10000) })
      ]);

      // Update model stats
      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const statusData = await statusRes.value.json();
        
        const modelsLoaded = document.getElementById('models-loaded');
        const hfMode = document.getElementById('hf-mode');
        const failedModels = document.getElementById('failed-models');
        const hfStatus = document.getElementById('hf-status');
        
        const loadedCount = statusData.models_loaded || statusData.models?.total_models || 0;
        const totalModels = statusData.models?.total_models || statusData.models_loaded || 0;
        const failedCount = totalModels - loadedCount;
        
        if (modelsLoaded) modelsLoaded.textContent = loadedCount;
        if (hfMode) hfMode.textContent = (statusData.hf_mode || 'off').toUpperCase();
        if (failedModels) failedModels.textContent = failedCount;
        
        if (hfStatus) {
          if (statusData.status === 'ready' || statusData.models_loaded > 0) {
            hfStatus.textContent = 'Ready';
            hfStatus.className = 'stat-trend success';
          } else {
            hfStatus.textContent = 'Disabled';
            hfStatus.className = 'stat-trend warning';
          }
        }
      }

      // Update analyses count
      const analysesToday = document.getElementById('analyses-today');
      if (analysesToday) {
        const today = new Date().toDateString();
        const todayCount = this.history.filter(h => new Date(h.timestamp).toDateString() === today).length;
        analysesToday.textContent = todayCount;
      }
      
      // Update resources stats if available
      if (resourcesRes.status === 'fulfilled' && resourcesRes.value.ok) {
        const resourcesData = await resourcesRes.value.json();
        if (resourcesData.resources) {
          const hfModels = resourcesData.huggingface_models || {};
          const totalModels = hfModels.total_models || 0;
          const loadedModels = hfModels.loaded_models || 0;
          
          // Update model stats with real data
          if (modelsLoaded && !modelsLoaded.textContent) {
            modelsLoaded.textContent = loadedModels;
          }
        }
      }
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment() {
    const text = document.getElementById('sentiment-input').value.trim();
    const mode = document.getElementById('sentiment-source').value;
    const symbol = document.getElementById('sentiment-symbol').value.trim().toUpperCase();
    const btn = document.getElementById('analyze-sentiment-btn');
    const resultDiv = document.getElementById('sentiment-result');

    if (!text) {
      this.showError(resultDiv, 'Please enter text to analyze');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Analyzing...';
    resultDiv?.classList.add('hidden');

    try {
      const payload = { text, mode, source: 'ai_tools' };
      if (symbol) payload.symbol = symbol;

      const response = await fetch('/api/sentiment/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Sentiment analysis failed');
      }

      this.displaySentimentResult(resultDiv, data);
      this.addToHistory('sentiment', { text, symbol, result: data });
      this.updateStats();
    } catch (error) {
      this.showError(resultDiv, error.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> Analyze Sentiment';
    }
  }

  /**
   * Display sentiment analysis result
   */
  displaySentimentResult(container, data) {
    if (!container) return;

    const label = data.label || 'unknown';
    const score = (data.score * 100).toFixed(1);
    const labelClass = label.toLowerCase();
    const engine = data.engine || 'unknown';
    
    let displayLabel = label;
    if (label === 'bullish' || label === 'positive') displayLabel = 'Bullish/Positive';
    else if (label === 'bearish' || label === 'negative') displayLabel = 'Bearish/Negative';
    else if (label === 'neutral') displayLabel = 'Neutral';
    
    let html = '<div class="result-box">';
    html += '<h3 style="margin-bottom: 15px; color: var(--text-primary);">Sentiment Analysis Result</h3>';
    html += `<div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">`;
    html += `<div>`;
    html += `<span class="badge badge-${labelClass}">${displayLabel.toUpperCase()}</span>`;
    html += `<span style="font-size: 1.3rem; font-weight: 700; color: var(--text-primary); margin-left: 10px;">${score}%</span>`;
    html += `</div>`;
    html += `<div style="font-size: 0.85rem; color: var(--text-secondary);">Engine: ${engine}</div>`;
    html += `</div>`;

    if (data.model) {
      html += `<p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 15px;">Model: ${data.model}</p>`;
    }

    if (data.details && data.details.labels && data.details.scores) {
      html += '<div class="score-bar">';
      for (let i = 0; i < data.details.labels.length; i++) {
        const lbl = data.details.labels[i];
        const scr = (data.details.scores[i] * 100).toFixed(1);
        html += '<div class="score-item">';
        html += `<span class="score-label">${lbl}</span>`;
        html += '<div class="score-progress">';
        html += `<div class="score-fill" style="width: ${scr}%"></div>`;
        html += '</div>';
        html += `<span class="score-value">${scr}%</span>`;
        html += '</div>';
      }
      html += '</div>';
    }
    
    if (engine === 'fallback_lexical') {
      html += '<div class="info-box" style="margin-top: 15px;">';
      html += '<strong>Note:</strong> Using fallback lexical analysis. HF models may be unavailable.';
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
    container.classList.remove('hidden');
  }

  /**
   * Summarize text
   */
  async summarizeText() {
    const text = document.getElementById('summary-input').value.trim();
    const maxSentences = parseInt(document.getElementById('max-sentences').value);
    const style = document.getElementById('summary-style').value;
    const btn = document.getElementById('summarize-btn');
    const resultDiv = document.getElementById('summary-result');

    if (!text) {
      this.showError(resultDiv, 'Please enter text to summarize');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Summarizing...';
    resultDiv?.classList.add('hidden');

    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, max_sentences: maxSentences, style })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Summarization failed');
      }

      this.displaySummaryResult(resultDiv, data, style);
      this.addToHistory('summarize', { text, maxSentences, result: data });
      this.updateStats();
    } catch (error) {
      this.showError(resultDiv, error.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> Summarize';
    }
  }

  /**
   * Display summary result
   */
  displaySummaryResult(container, data, style = 'detailed') {
    if (!container) return;

    let html = '<div class="result-box">';
    html += '<h3 style="margin-bottom: 15px; color: var(--text-primary);">Summary</h3>';
    
    if (data.summary) {
      if (style === 'bullet') {
        html += '<ul class="sentences-list">';
        data.summary.split('.').filter(s => s.trim()).forEach(sentence => {
          html += `<li>${this.escapeHtml(sentence.trim())}.</li>`;
        });
        html += '</ul>';
      } else {
        html += `<div class="summary-text">${this.escapeHtml(data.summary)}</div>`;
      }
    }

    if (data.sentences && data.sentences.length > 0 && style !== 'bullet') {
      html += '<h4 style="margin: 20px 0 10px 0; color: var(--text-secondary); font-size: 1.1rem;">Key Sentences</h4>';
      html += '<ul class="sentences-list">';
      data.sentences.forEach(sentence => {
        html += `<li>${this.escapeHtml(sentence)}</li>`;
      });
      html += '</ul>';
    }

    html += '</div>';
    container.innerHTML = html;
    container.classList.remove('hidden');
  }

  /**
   * Analyze news article
   */
  async analyzeNews() {
    const text = document.getElementById('news-input').value.trim();
    const symbol = document.getElementById('news-symbol').value.trim().toUpperCase();
    const analysisType = document.getElementById('analysis-type').value;
    const btn = document.getElementById('analyze-news-btn');
    const resultDiv = document.getElementById('news-result');

    if (!text) {
      this.showError(resultDiv, 'Please enter news text to analyze');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Analyzing...';
    resultDiv?.classList.add('hidden');

    try {
      const results = {};
      
      if (analysisType === 'full' || analysisType === 'sentiment') {
        const sentimentRes = await fetch('/api/sentiment/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, mode: 'news', symbol })
        });
        if (sentimentRes.ok) {
          results.sentiment = await sentimentRes.json();
        }
      }

      if (analysisType === 'full' || analysisType === 'summary') {
        const summaryRes = await fetch('/api/ai/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, max_sentences: 3 })
        });
        if (summaryRes.ok) {
          results.summary = await summaryRes.json();
        }
      }

      this.displayNewsResult(resultDiv, results);
      this.addToHistory('news', { text, symbol, result: results });
      this.updateStats();
    } catch (error) {
      this.showError(resultDiv, error.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path><path d="M18 14h-8"></path><path d="M15 18h-5"></path><path d="M10 6h8v4h-8V6Z"></path></svg> Analyze News';
    }
  }

  /**
   * Display news analysis result
   */
  displayNewsResult(container, results) {
    if (!container) return;

    let html = '<div class="result-box">';
    html += '<h3 style="margin-bottom: 15px; color: var(--text-primary);">News Analysis Result</h3>';

    if (results.sentiment && results.sentiment.ok) {
      const sent = results.sentiment;
      const label = sent.label || 'unknown';
      const score = (sent.score * 100).toFixed(1);
      html += '<div style="margin-bottom: 20px;">';
      html += '<h4 style="color: var(--text-secondary); margin-bottom: 10px;">Sentiment</h4>';
      html += `<span class="badge badge-${label.toLowerCase()}">${label.toUpperCase()}</span>`;
      html += `<span style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin-left: 10px;">${score}%</span>`;
      html += '</div>';
    }

    if (results.summary && results.summary.ok) {
      html += '<div>';
      html += '<h4 style="color: var(--text-secondary); margin-bottom: 10px;">Summary</h4>';
      html += `<div class="summary-text">${this.escapeHtml(results.summary.summary || '')}</div>`;
      html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
    container.classList.remove('hidden');
  }

  /**
   * Get trading decision
   */
  async getTradingDecision() {
    const symbol = document.getElementById('trading-symbol').value.trim().toUpperCase();
    const timeframe = document.getElementById('trading-timeframe').value;
    const context = document.getElementById('trading-context').value.trim();
    const btn = document.getElementById('get-trading-decision-btn');
    const resultDiv = document.getElementById('trading-result');

    if (!symbol) {
      this.showError(resultDiv, 'Please enter an asset symbol');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Analyzing...';
    resultDiv?.classList.add('hidden');

    try {
      const response = await fetch('/api/ai/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, timeframe, context })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Trading decision failed');
      }

      this.displayTradingResult(resultDiv, data);
      this.addToHistory('trading', { symbol, timeframe, result: data });
      this.updateStats();
    } catch (error) {
      this.showError(resultDiv, error.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg> Get Trading Decision';
    }
  }

  /**
   * Display trading decision result
   */
  displayTradingResult(container, data) {
    if (!container) return;

    const decision = data.decision || data.action || 'HOLD';
    const confidence = data.confidence || data.score || 0;
    const reasoning = data.reasoning || data.reason || 'No reasoning provided';

    // Sanitize all dynamic content
    const safeDecision = this.escapeHtml(decision);
    const safeConfidence = this.escapeHtml((confidence * 100).toFixed(1));
    const safeReasoning = this.escapeHtml(reasoning);

    let html = '<div class="result-box">';
    html += '<h3 style="margin-bottom: 15px; color: var(--text-primary);">Trading Decision</h3>';
    html += `<div style="margin-bottom: 20px;">`;
    html += `<span class="badge badge-${this.escapeHtml(decision.toLowerCase())}">${safeDecision}</span>`;
    html += `<span style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin-left: 10px;">${safeConfidence}% Confidence</span>`;
    html += `</div>`;
    html += `<div class="summary-text">${safeReasoning}</div>`;
    html += '</div>';
    
    container.innerHTML = html;
    container.classList.remove('hidden');
  }

  /**
   * Process batch of texts
   */
  async processBatch() {
    const text = document.getElementById('batch-input').value.trim();
    const operation = document.getElementById('batch-operation').value;
    const format = document.getElementById('batch-format').value;
    const btn = document.getElementById('process-batch-btn');
    const resultDiv = document.getElementById('batch-result');

    if (!text) {
      this.showError(resultDiv, 'Please enter texts to process');
      return;
    }

    const texts = text.split('\n').filter(t => t.trim());
    if (texts.length === 0) {
      this.showError(resultDiv, 'Please enter at least one text');
      return;
    }

    btn.disabled = true;
    const safeCount = this.escapeHtml(String(texts.length));
    btn.innerHTML = `<span class="loading"></span> Processing ${safeCount} items...`;
    resultDiv?.classList.add('hidden');

    try {
      const results = [];
      
      for (let i = 0; i < texts.length; i++) {
        const item = { text: texts[i], index: i + 1 };
        
        if (operation === 'sentiment' || operation === 'both') {
          const res = await fetch('/api/sentiment/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: texts[i], mode: 'auto' })
          });
          if (res.ok) {
            item.sentiment = await res.json();
          }
        }
        
        if (operation === 'summarize' || operation === 'both') {
          const res = await fetch('/api/ai/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: texts[i], max_sentences: 2 })
          });
          if (res.ok) {
            item.summary = await res.json();
          }
        }
        
        results.push(item);
      }

      this.displayBatchResult(resultDiv, results, format);
      this.addToHistory('batch', { count: texts.length, operation, results });
      this.updateStats();
    } catch (error) {
      this.showError(resultDiv, error.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg> Process Batch';
    }
  }

  /**
   * Display batch processing result
   */
  displayBatchResult(container, results, format) {
    if (!container) return;

    let html = '<div class="result-box">';
    html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">';
    html += `<h3 style="color: var(--text-primary);">Batch Results (${results.length} items)</h3>`;
    html += `<button onclick="aiToolsPage.downloadBatchResults(${JSON.stringify(results).replace(/"/g, '&quot;')})" class="btn btn-secondary" style="padding: 8px 16px;">Download JSON</button>`;
    html += '</div>';

    if (format === 'table') {
      html += '<div class="table-container"><table><thead><tr><th>#</th><th>Text Preview</th>';
      if (results[0].sentiment) html += '<th>Sentiment</th>';
      if (results[0].summary) html += '<th>Summary</th>';
      html += '</tr></thead><tbody>';
      
      results.forEach(item => {
        html += '<tr>';
        html += `<td>${item.index}</td>`;
        html += `<td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(item.text.substring(0, 100))}...</td>`;
        if (item.sentiment && item.sentiment.ok) {
          const sentimentLabel = this.escapeHtml(item.sentiment.label || 'N/A');
          const sentimentClass = this.escapeHtml((item.sentiment.label?.toLowerCase() || 'neutral'));
          html += `<td><span class="badge badge-${sentimentClass}">${sentimentLabel}</span></td>`;
        }
        if (item.summary && item.summary.ok) {
          html += `<td style="max-width: 200px;">${this.escapeHtml(item.summary.summary?.substring(0, 80) || '')}...</td>`;
        }
        html += '</tr>';
      });
      
      html += '</tbody></table></div>';
    } else {
      html += '<pre style="background: rgba(30, 41, 59, 0.6); padding: 15px; border-radius: 8px; overflow-x: auto; max-height: 500px; overflow-y: auto;">';
      html += this.escapeHtml(JSON.stringify(results, null, 2));
      html += '</pre>';
    }

    html += '</div>';
    container.innerHTML = html;
    container.classList.remove('hidden');
  }

  /**
   * Download batch results
   */
  downloadBatchResults(results) {
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `batch-results-${Date.now()}.json`);
    link.click();
  }

  /**
   * Load model status
   */
  async loadModelStatus() {
    const statusDiv = document.getElementById('registry-status');
    const tableDiv = document.getElementById('models-table');
    const btn = document.getElementById('refresh-status-btn');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="loading"></span> Loading...';
    }

    try {
      const [statusRes, listRes] = await Promise.all([
        fetch('/api/models/status'),
        fetch('/api/models/list')
      ]);

      const statusData = await statusRes.json();
      const listData = await listRes.json();

      this.displayRegistryStatus(statusDiv, statusData);
      this.displayModelsTable(tableDiv, listData);
      this.updateStats();
    } catch (error) {
      this.showError(statusDiv, 'Failed to load model status: ' + error.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Refresh';
      }
    }
  }

  /**
   * Display registry status
   */
  displayRegistryStatus(container, data) {
    if (!container) return;

    let html = '<div class="status-grid">';
    
    html += '<div class="status-item">';
    html += '<div class="status-label">HF Mode</div>';
    html += `<div class="status-value">${data.hf_mode || 'unknown'}</div>`;
    html += '</div>';

    html += '<div class="status-item">';
    html += '<div class="status-label">Overall Status</div>';
    html += `<div class="status-value">${data.status || 'unknown'}</div>`;
    html += '</div>';

    html += '<div class="status-item">';
    html += '<div class="status-label">Models Loaded</div>';
    html += `<div class="status-value">${data.models_loaded || 0}</div>`;
    html += '</div>';

    html += '<div class="status-item">';
    html += '<div class="status-label">Models Failed</div>';
    html += `<div class="status-value">${data.models_failed || 0}</div>`;
    html += '</div>';

    html += '</div>';

    if (data.status === 'disabled' || data.hf_mode === 'off') {
      html += '<div class="info-box">';
      html += '<strong>Note:</strong> HF models are disabled. To enable them, set HF_MODE=public or HF_MODE=auth in the environment.';
      html += '</div>';
    } else if (data.models_loaded === 0 && data.status !== 'disabled') {
      html += '<div class="warning-box">';
      html += '<strong>Warning:</strong> No models could be loaded. Check model IDs or HF credentials.';
      html += '</div>';
    }

    if (data.error) {
      html += '<div class="error-box" style="margin-top: 15px;">';
      html += `<strong>Error:</strong> ${this.escapeHtml(data.error)}`;
      html += '</div>';
    }

    if (data.failed && data.failed.length > 0) {
      html += '<div style="margin-top: 20px;">';
      html += '<h4 style="color: var(--text-secondary); margin-bottom: 10px;">Failed Models</h4>';
      html += '<div style="background: rgba(30, 41, 59, 0.6); border-radius: 8px; padding: 15px;">';
      data.failed.forEach(([key, error]) => {
        html += `<div style="margin-bottom: 8px; padding: 8px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 4px;">`;
        html += `<strong style="color: #fca5a5;">${key}:</strong> `;
        html += `<span style="color: var(--text-secondary);">${this.escapeHtml(error)}</span>`;
        html += `</div>`;
      });
      html += '</div>';
      html += '</div>';
    }

    container.innerHTML = html;
  }

  /**
   * Display models table
   */
  displayModelsTable(container, data) {
    if (!container) return;

    if (!data.models || data.models.length === 0) {
      container.innerHTML = '<div class="info-box">No models configured</div>';
      return;
    }

    let html = '<div class="table-container">';
    html += '<table>';
    html += '<thead><tr>';
    html += '<th>Key</th>';
    html += '<th>Task</th>';
    html += '<th>Model ID</th>';
    html += '<th>Loaded</th>';
    html += '<th>Error</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    data.models.forEach(model => {
      html += '<tr>';
      html += `<td><strong>${model.key || 'N/A'}</strong></td>`;
      html += `<td>${model.task || 'N/A'}</td>`;
      html += `<td style="font-family: monospace; font-size: 0.85rem;">${model.model_id || 'N/A'}</td>`;
      html += '<td>';
      if (model.loaded) {
        html += '<span class="badge badge-success">Yes</span>';
      } else {
        html += '<span class="badge badge-danger">No</span>';
      }
      html += '</td>';
      html += `<td style="color: #f87171; font-size: 0.85rem;">${model.error ? this.escapeHtml(model.error) : '-'}</td>`;
      html += '</tr>';
    });

    html += '</tbody>';
    html += '</table>';
    html += '</div>';

    container.innerHTML = html;
  }

  /**
   * Add to history
   */
  addToHistory(type, data) {
    const entry = {
      type,
      timestamp: new Date().toISOString(),
      data
    };
    this.history.unshift(entry);
    if (this.history.length > 100) {
      this.history = this.history.slice(0, 100);
    }
    this.saveHistory();
    this.renderHistory();
  }

  /**
   * Load history from localStorage
   */
  loadHistory() {
    try {
      const stored = localStorage.getItem('ai-tools-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save history to localStorage
   */
  saveHistory() {
    try {
      localStorage.setItem('ai-tools-history', JSON.stringify(this.history));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  /**
   * Render history list
   */
  renderHistory() {
    const container = document.getElementById('history-list');
    if (!container) return;

    if (this.history.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No analysis history yet. Start analyzing to see your history here.</p></div>';
      return;
    }

    let html = '';
    this.history.slice(0, 50).forEach((entry, index) => {
      const date = new Date(entry.timestamp);
      html += `<div class="history-item">`;
      html += `<div class="history-header">`;
      html += `<span class="history-type">${entry.type.toUpperCase()}</span>`;
      html += `<span class="history-time">${date.toLocaleString()}</span>`;
      html += `</div>`;
      html += `<div class="history-preview">${this.escapeHtml(JSON.stringify(entry.data).substring(0, 150))}...</div>`;
      html += `<button onclick="aiToolsPage.viewHistoryItem(${index})" class="btn btn-sm btn-secondary">View</button>`;
      html += `</div>`;
    });

    container.innerHTML = html;
  }

  /**
   * View history item
   */
  viewHistoryItem(index) {
    const entry = this.history[index];
    if (!entry) return;

    alert(JSON.stringify(entry, null, 2));
  }

  /**
   * Clear history
   */
  clearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
      this.history = [];
      this.saveHistory();
      this.renderHistory();
      this.updateStats();
    }
  }

  /**
   * Export history
   */
  exportHistory() {
    const dataStr = JSON.stringify(this.history, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `ai-tools-history-${Date.now()}.json`);
    link.click();
  }

  /**
   * Show error message
   */
  showError(container, message) {
    if (!container) return;
    container.innerHTML = `<div class="error-box"><strong>Error:</strong> ${this.escapeHtml(message)}</div>`;
    container.classList.remove('hidden');
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default AIToolsPage;
