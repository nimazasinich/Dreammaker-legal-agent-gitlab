/**
 * Settings Page - Functional Implementation
 * Manages all application settings with local storage persistence
 */

import { api } from '../../shared/js/core/api-client.js';
import { LayoutManager } from '../../shared/js/core/layout-manager.js';
import { Toast } from '../../shared/js/components/toast.js';

// Default settings
const DEFAULT_SETTINGS = {
  tokens: {
    hfToken: '',
    coingeckoKey: '',
    cmcKey: '',
    etherscanKey: '',
    cryptocompareKey: '',
  },
  telegram: {
    botToken: '',
    chatId: '',
    enabled: true,
    silent: false,
    includeCharts: true,
  },
  signals: {
    bullish: true,
    bearish: true,
    whale: true,
    news: false,
    sentiment: true,
    price: true,
    confidenceThreshold: 70,
    priceChangeThreshold: 5,
    whaleThreshold: 100000,
    watchedCoins: 'BTC, ETH, SOL',
  },
  scheduling: {
    autoRefreshEnabled: true,
    intervalMarket: 30,
    intervalNews: 120,
    intervalSentiment: 300,
    intervalWhale: 60,
    intervalBlockchain: 300,
    intervalModels: 600,
    quietHoursEnabled: false,
    quietStart: '22:00',
    quietEnd: '08:00',
  },
  notifications: {
    browser: true,
    sound: true,
    toast: true,
    soundType: 'default',
    volume: 50,
  },
  appearance: {
    theme: 'dark',
    compactMode: false,
    showAnimations: true,
    showBgEffects: true,
  },
};

const STORAGE_KEY = 'crypto_monitor_settings';

class SettingsPage {
  constructor() {
    this.settings = this.loadSettings();
    this.activeSection = 'api-tokens';
  }

  async init() {
    try {
      await LayoutManager.injectLayouts();
      LayoutManager.setActiveNav('settings');
      
      this.bindEvents();
      this.populateForm();
      this.applySettings();
    } catch (error) {
      console.error('[Settings] Init error:', error);
      Toast.error('Failed to initialize settings page');
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all keys exist
        return this.deepMerge(DEFAULT_SETTINGS, parsed);
      }
    } catch (error) {
      console.warn('[Settings] Could not load settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      return true;
    } catch (error) {
      console.error('[Settings] Could not save settings:', error);
      return false;
    }
  }

  deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  bindEvents() {
    // Navigation buttons
    document.querySelectorAll('.settings-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchSection(e.target.closest('.settings-nav-btn').dataset.section));
    });

    // Save all button
    document.getElementById('save-all-btn')?.addEventListener('click', () => this.saveAllSettings());

    // Reset button
    document.getElementById('reset-btn')?.addEventListener('click', () => this.resetSettings());

    // Toggle visibility buttons
    document.querySelectorAll('.toggle-visibility').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.target.closest('.toggle-visibility').dataset.target;
        this.togglePasswordVisibility(targetId);
      });
    });

    // Range inputs with value display
    this.bindRangeInput('signal-confidence', 'confidence-value', '%');
    this.bindRangeInput('price-change-threshold', 'price-threshold-value', '%');
    this.bindRangeInput('notif-volume', 'volume-value', '%');

    // Section-specific save buttons
    document.getElementById('save-tokens-btn')?.addEventListener('click', () => this.saveTokens());
    document.getElementById('test-tokens-btn')?.addEventListener('click', () => this.testTokens());
    document.getElementById('save-telegram-btn')?.addEventListener('click', () => this.saveTelegram());
    document.getElementById('test-telegram-btn')?.addEventListener('click', () => this.testTelegram());
    document.getElementById('save-signals-btn')?.addEventListener('click', () => this.saveSignals());
    document.getElementById('save-scheduling-btn')?.addEventListener('click', () => this.saveScheduling());
    document.getElementById('save-notif-btn')?.addEventListener('click', () => this.saveNotifications());
    document.getElementById('test-notif-btn')?.addEventListener('click', () => this.testNotification());
    document.getElementById('save-appearance-btn')?.addEventListener('click', () => this.saveAppearance());

    // Theme radio buttons
    document.querySelectorAll('input[name="theme"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.settings.appearance.theme = e.target.value;
        this.applyTheme();
      });
    });

    // Auto-save toggle changes
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
      toggle.addEventListener('change', () => this.handleToggleChange(toggle));
    });
  }

  bindRangeInput(rangeId, valueId, suffix = '') {
    const range = document.getElementById(rangeId);
    const valueEl = document.getElementById(valueId);
    if (range && valueEl) {
      range.addEventListener('input', () => {
        valueEl.textContent = `${range.value}${suffix}`;
      });
    }
  }

  switchSection(sectionId) {
    // Update nav buttons
    document.querySelectorAll('.settings-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === sectionId);
    });

    // Update sections
    document.querySelectorAll('.settings-section').forEach(section => {
      section.classList.toggle('active', section.id === `section-${sectionId}`);
    });

    this.activeSection = sectionId;
  }

  populateForm() {
    // API Tokens
    this.setInputValue('hf-token', this.settings.tokens.hfToken);
    this.setInputValue('coingecko-key', this.settings.tokens.coingeckoKey);
    this.setInputValue('cmc-key', this.settings.tokens.cmcKey);
    this.setInputValue('etherscan-key', this.settings.tokens.etherscanKey);
    this.setInputValue('cryptocompare-key', this.settings.tokens.cryptocompareKey);

    // Telegram
    this.setInputValue('telegram-bot-token', this.settings.telegram.botToken);
    this.setInputValue('telegram-chat-id', this.settings.telegram.chatId);
    this.setCheckbox('telegram-enabled', this.settings.telegram.enabled);
    this.setCheckbox('telegram-silent', this.settings.telegram.silent);
    this.setCheckbox('telegram-charts', this.settings.telegram.includeCharts);

    // Signals
    this.setCheckbox('signal-bullish', this.settings.signals.bullish);
    this.setCheckbox('signal-bearish', this.settings.signals.bearish);
    this.setCheckbox('signal-whale', this.settings.signals.whale);
    this.setCheckbox('signal-news', this.settings.signals.news);
    this.setCheckbox('signal-sentiment', this.settings.signals.sentiment);
    this.setCheckbox('signal-price', this.settings.signals.price);
    this.setRangeValue('signal-confidence', this.settings.signals.confidenceThreshold, 'confidence-value', '%');
    this.setRangeValue('price-change-threshold', this.settings.signals.priceChangeThreshold, 'price-threshold-value', '%');
    this.setInputValue('whale-threshold', this.settings.signals.whaleThreshold);
    this.setInputValue('watched-coins', this.settings.signals.watchedCoins);

    // Scheduling
    this.setCheckbox('auto-refresh-enabled', this.settings.scheduling.autoRefreshEnabled);
    this.setSelectValue('interval-market', this.settings.scheduling.intervalMarket);
    this.setSelectValue('interval-news', this.settings.scheduling.intervalNews);
    this.setSelectValue('interval-sentiment', this.settings.scheduling.intervalSentiment);
    this.setSelectValue('interval-whale', this.settings.scheduling.intervalWhale);
    this.setSelectValue('interval-blockchain', this.settings.scheduling.intervalBlockchain);
    this.setSelectValue('interval-models', this.settings.scheduling.intervalModels);
    this.setCheckbox('quiet-hours-enabled', this.settings.scheduling.quietHoursEnabled);
    this.setInputValue('quiet-start', this.settings.scheduling.quietStart);
    this.setInputValue('quiet-end', this.settings.scheduling.quietEnd);

    // Notifications
    this.setCheckbox('notif-browser', this.settings.notifications.browser);
    this.setCheckbox('notif-sound', this.settings.notifications.sound);
    this.setCheckbox('notif-toast', this.settings.notifications.toast);
    this.setSelectValue('notif-sound-type', this.settings.notifications.soundType);
    this.setRangeValue('notif-volume', this.settings.notifications.volume, 'volume-value', '%');

    // Appearance
    this.setRadioValue('theme', this.settings.appearance.theme);
    this.setCheckbox('compact-mode', this.settings.appearance.compactMode);
    this.setCheckbox('show-animations', this.settings.appearance.showAnimations);
    this.setCheckbox('show-bg-effects', this.settings.appearance.showBgEffects);
  }

  // Helper methods for form population
  setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  }

  setCheckbox(id, checked) {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
  }

  setSelectValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  setRadioValue(name, value) {
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) radio.checked = true;
  }

  setRangeValue(id, value, valueDisplayId, suffix = '') {
    const range = document.getElementById(id);
    const valueDisplay = document.getElementById(valueDisplayId);
    if (range) range.value = value;
    if (valueDisplay) valueDisplay.textContent = `${value}${suffix}`;
  }

  togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  }

  handleToggleChange(toggle) {
    // Auto-apply certain toggles immediately
    if (toggle.id === 'show-animations') {
      this.applyAnimations(toggle.checked);
    } else if (toggle.id === 'show-bg-effects') {
      this.applyBgEffects(toggle.checked);
    }
  }

  // Save methods
  saveTokens() {
    this.settings.tokens = {
      hfToken: document.getElementById('hf-token')?.value || '',
      coingeckoKey: document.getElementById('coingecko-key')?.value || '',
      cmcKey: document.getElementById('cmc-key')?.value || '',
      etherscanKey: document.getElementById('etherscan-key')?.value || '',
      cryptocompareKey: document.getElementById('cryptocompare-key')?.value || '',
    };

    if (this.saveSettings()) {
      Toast.success('API tokens saved successfully');
      this.sendTokensToBackend();
    } else {
      Toast.error('Failed to save tokens');
    }
  }

  async sendTokensToBackend() {
    try {
      await api.post('/settings/tokens', this.settings.tokens);
    } catch (error) {
      console.warn('[Settings] Could not sync tokens with backend:', error);
    }
  }

  async testTokens() {
    Toast.info('Testing API tokens...');
    
    const results = [];
    
    // Test HuggingFace
    if (this.settings.tokens.hfToken) {
      try {
        const response = await fetch('https://huggingface.co/api/whoami-v2', {
          headers: { 'Authorization': `Bearer ${this.settings.tokens.hfToken}` }
        });
        results.push({ name: 'HuggingFace', ok: response.ok });
      } catch {
        results.push({ name: 'HuggingFace', ok: false });
      }
    }

    // Test CoinGecko
    if (this.settings.tokens.coingeckoKey) {
      try {
        const response = await fetch(`https://api.coingecko.com/api/v3/ping?x_cg_demo_api_key=${this.settings.tokens.coingeckoKey}`);
        results.push({ name: 'CoinGecko', ok: response.ok });
      } catch {
        results.push({ name: 'CoinGecko', ok: false });
      }
    }

    // Show results
    const passed = results.filter(r => r.ok).length;
    const total = results.length;
    
    if (total === 0) {
      Toast.warning('No tokens configured to test');
    } else if (passed === total) {
      Toast.success(`All ${total} tokens verified successfully`);
    } else {
      Toast.warning(`${passed}/${total} tokens verified`);
    }
  }

  saveTelegram() {
    this.settings.telegram = {
      botToken: document.getElementById('telegram-bot-token')?.value || '',
      chatId: document.getElementById('telegram-chat-id')?.value || '',
      enabled: document.getElementById('telegram-enabled')?.checked || false,
      silent: document.getElementById('telegram-silent')?.checked || false,
      includeCharts: document.getElementById('telegram-charts')?.checked || false,
    };

    if (this.saveSettings()) {
      Toast.success('Telegram settings saved');
      this.sendTelegramToBackend();
    } else {
      Toast.error('Failed to save Telegram settings');
    }
  }

  async sendTelegramToBackend() {
    try {
      await api.post('/settings/telegram', this.settings.telegram);
    } catch (error) {
      console.warn('[Settings] Could not sync Telegram settings with backend:', error);
    }
  }

  async testTelegram() {
    const botToken = document.getElementById('telegram-bot-token')?.value;
    const chatId = document.getElementById('telegram-chat-id')?.value;

    if (!botToken || !chatId) {
      Toast.warning('Please enter both bot token and chat ID');
      return;
    }

    Toast.info('Sending test message...');

    try {
      const message = `🚀 *Crypto Monitor ULTIMATE*\n\nTest message sent successfully!\n\n_Time: ${new Date().toLocaleString()}_`;
      
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_notification: document.getElementById('telegram-silent')?.checked || false,
        }),
      });

      const data = await response.json();
      
      if (data.ok) {
        Toast.success('Test message sent successfully! Check your Telegram.');
      } else {
        Toast.error(`Telegram error: ${data.description}`);
      }
    } catch (error) {
      Toast.error(`Failed to send test message: ${error.message}`);
    }
  }

  saveSignals() {
    this.settings.signals = {
      bullish: document.getElementById('signal-bullish')?.checked || false,
      bearish: document.getElementById('signal-bearish')?.checked || false,
      whale: document.getElementById('signal-whale')?.checked || false,
      news: document.getElementById('signal-news')?.checked || false,
      sentiment: document.getElementById('signal-sentiment')?.checked || false,
      price: document.getElementById('signal-price')?.checked || false,
      confidenceThreshold: parseInt(document.getElementById('signal-confidence')?.value) || 70,
      priceChangeThreshold: parseInt(document.getElementById('price-change-threshold')?.value) || 5,
      whaleThreshold: parseInt(document.getElementById('whale-threshold')?.value) || 100000,
      watchedCoins: document.getElementById('watched-coins')?.value || 'BTC, ETH, SOL',
    };

    if (this.saveSettings()) {
      Toast.success('Signal settings saved');
      this.sendSignalsToBackend();
    } else {
      Toast.error('Failed to save signal settings');
    }
  }

  async sendSignalsToBackend() {
    try {
      await api.post('/settings/signals', this.settings.signals);
    } catch (error) {
      console.warn('[Settings] Could not sync signal settings with backend:', error);
    }
  }

  saveScheduling() {
    this.settings.scheduling = {
      autoRefreshEnabled: document.getElementById('auto-refresh-enabled')?.checked || false,
      intervalMarket: parseInt(document.getElementById('interval-market')?.value) || 30,
      intervalNews: parseInt(document.getElementById('interval-news')?.value) || 120,
      intervalSentiment: parseInt(document.getElementById('interval-sentiment')?.value) || 300,
      intervalWhale: parseInt(document.getElementById('interval-whale')?.value) || 60,
      intervalBlockchain: parseInt(document.getElementById('interval-blockchain')?.value) || 300,
      intervalModels: parseInt(document.getElementById('interval-models')?.value) || 600,
      quietHoursEnabled: document.getElementById('quiet-hours-enabled')?.checked || false,
      quietStart: document.getElementById('quiet-start')?.value || '22:00',
      quietEnd: document.getElementById('quiet-end')?.value || '08:00',
    };

    if (this.saveSettings()) {
      Toast.success('Schedule settings saved');
      this.applyScheduling();
    } else {
      Toast.error('Failed to save schedule settings');
    }
  }

  applyScheduling() {
    // Dispatch custom event for other components to react
    window.dispatchEvent(new CustomEvent('settingsChanged', {
      detail: { scheduling: this.settings.scheduling }
    }));
  }

  saveNotifications() {
    this.settings.notifications = {
      browser: document.getElementById('notif-browser')?.checked || false,
      sound: document.getElementById('notif-sound')?.checked || false,
      toast: document.getElementById('notif-toast')?.checked || false,
      soundType: document.getElementById('notif-sound-type')?.value || 'default',
      volume: parseInt(document.getElementById('notif-volume')?.value) || 50,
    };

    if (this.saveSettings()) {
      Toast.success('Notification settings saved');
    } else {
      Toast.error('Failed to save notification settings');
    }
  }

  testNotification() {
    // Test browser notification
    if (this.settings.notifications.browser && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Crypto Monitor ULTIMATE', {
          body: 'Test notification! Your settings are working.',
          icon: '/static/assets/icons/favicon.svg'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Crypto Monitor ULTIMATE', {
              body: 'Notifications enabled successfully!',
              icon: '/static/assets/icons/favicon.svg'
            });
          }
        });
      }
    }

    // Test toast
    if (this.settings.notifications.toast) {
      Toast.info('Test notification! Your settings are working.');
    }

    // Test sound (placeholder - would need audio files)
    if (this.settings.notifications.sound) {
      console.log('[Settings] Would play sound:', this.settings.notifications.soundType);
    }
  }

  saveAppearance() {
    this.settings.appearance = {
      theme: document.querySelector('input[name="theme"]:checked')?.value || 'dark',
      compactMode: document.getElementById('compact-mode')?.checked || false,
      showAnimations: document.getElementById('show-animations')?.checked || true,
      showBgEffects: document.getElementById('show-bg-effects')?.checked || true,
    };

    if (this.saveSettings()) {
      Toast.success('Appearance settings saved');
      this.applySettings();
    } else {
      Toast.error('Failed to save appearance settings');
    }
  }

  applySettings() {
    this.applyTheme();
    this.applyAnimations(this.settings.appearance.showAnimations);
    this.applyBgEffects(this.settings.appearance.showBgEffects);
    this.applyCompactMode(this.settings.appearance.compactMode);
  }

  applyTheme() {
    const theme = this.settings.appearance.theme;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  applyAnimations(enabled) {
    document.body.classList.toggle('no-animations', !enabled);
  }

  applyBgEffects(enabled) {
    const bgEffects = document.querySelector('.background-effects');
    if (bgEffects) {
      bgEffects.style.display = enabled ? 'block' : 'none';
    }
  }

  applyCompactMode(enabled) {
    document.body.classList.toggle('compact-mode', enabled);
  }

  saveAllSettings() {
    this.saveTokens();
    this.saveTelegram();
    this.saveSignals();
    this.saveScheduling();
    this.saveNotifications();
    this.saveAppearance();
    Toast.success('All settings saved successfully!');
  }

  resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      this.settings = { ...DEFAULT_SETTINGS };
      this.saveSettings();
      this.populateForm();
      this.applySettings();
      Toast.info('Settings reset to defaults');
    }
  }
}

// Initialize page
const page = new SettingsPage();
window.settingsPage = page;

// Export settings getter for other modules
export function getSettings() {
  return page.settings;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => page.init());
} else {
  page.init();
}

