import { readVault, writeVault } from '../config/secrets.js';
import { Logger } from '../core/Logger.js';
import type { Signal } from './SignalGeneratorService.js';

interface TelegramConfig {
  enabled: boolean;
  bot_token?: string;
  chat_id?: string;
  flags: {
    signals: boolean;
    positions: boolean;
    liquidation: boolean;
    success: boolean;
  };
}

export interface PositionPayload {
  symbol: string;
  size: number;
  averagePrice: number;
  leverage?: number;
  unrealizedPnL?: number;
  realizedPnL?: number;
}

export class TelegramService {
  private static instance: TelegramService;
  private logger = Logger.getInstance();
  private config: TelegramConfig = {
    enabled: false,
    flags: {
      signals: true,
      positions: true,
      liquidation: true,
      success: true
    }
  };

  private constructor() {
    this.reload();
  }

  static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  async reload(): Promise<void> {
    try {
      const vault = await readVault();
      const telegramConfig: any = vault.telegram || {};
      this.config = {
        enabled: telegramConfig.enabled || false,
        bot_token: telegramConfig.bot_token,
        chat_id: telegramConfig.chat_id,
        flags: {
          signals: telegramConfig.flags?.signals !== false,
          positions: telegramConfig.flags?.positions !== false,
          liquidation: telegramConfig.flags?.liquidation !== false,
          success: telegramConfig.flags?.success !== false
        }
      };
    } catch (error) {
      this.logger.error('Failed to reload Telegram config', {}, error as Error);
    }
  }

  isConfigured(): boolean {
    return this.config.enabled && !!this.config.bot_token && !!this.config.chat_id;
  }

  async sendText(text: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.config.bot_token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config.chat_id,
          text: text,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error('Telegram API error', { status: response.status, error: errorData }, new Error('Telegram send failed'));
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to send Telegram message', {}, error as Error);
      return false;
    }
  }

  async notifySignal(signal: Signal): Promise<void> {
    if (!this.isConfigured() || !this.config.flags.signals) {
      return;
    }

    try {
      const timeframe = signal.timeframes ? Object.keys(signal.timeframes)[0] : 'N/A';
      const reasoningText = Array.isArray(signal.reasoning) ? signal.reasoning.join(', ') : 'N/A';
      const text = `*Signal*: ${signal.symbol} ${signal.action} @ ${timeframe}\\n` +
        `Score: ${signal.confidence.toFixed(2)}\\n` +
        `Reasoning: ${reasoningText}`;
      await this.sendText(text);
    } catch (error) {
      this.logger.error('Failed to notify signal', { symbol: signal.symbol }, error as Error);
    }
  }

  async notifyPositionOpenClose(position: PositionPayload, opened: boolean): Promise<void> {
    if (!this.isConfigured() || !this.config.flags.positions) {
      return;
    }

    try {
      const status = opened ? 'OPENED' : 'CLOSED';
      const pnl = opened ? '' : `\\nPnL: ${(position.realizedPnL || 0).toFixed(2)}`;
      const text = `*Position ${status}*: ${position.symbol}\\n` +
        `Size: ${position.size}\\n` +
        `Entry: ${position.averagePrice}${pnl}`;
      await this.sendText(text);
    } catch (error) {
      this.logger.error('Failed to notify position', { symbol: position.symbol }, error as Error);
    }
  }

  async notifyLiquidationRisk(position: PositionPayload, risk: number): Promise<void> {
    if (!this.isConfigured() || !this.config.flags.liquidation) {
      return;
    }

    if (risk < 0.8) {
      return;
    }

    try {
      const text = `⚠️ *Liquidation Risk*: ${position.symbol}\\n` +
        `Risk: ${(risk * 100).toFixed(2)}%\\n` +
        `Size: ${position.size}\\n` +
        `Entry: ${position.averagePrice}`;
      await this.sendText(text);
    } catch (error) {
      this.logger.error('Failed to notify liquidation risk', { symbol: position.symbol }, error as Error);
    }
  }

  async notifyPositionSuccess(position: PositionPayload, pnl: number): Promise<void> {
    if (!this.isConfigured() || !this.config.flags.success) {
      return;
    }

    try {
      const emoji = pnl >= 0 ? '✅' : '❌';
      const text = `${emoji} *Position Result*: ${position.symbol}\\n` +
        `PnL: ${pnl.toFixed(2)}\\n` +
        `Entry: ${position.averagePrice}`;
      await this.sendText(text);
    } catch (error) {
      this.logger.error('Failed to notify position success', { symbol: position.symbol }, error as Error);
    }
  }
}

