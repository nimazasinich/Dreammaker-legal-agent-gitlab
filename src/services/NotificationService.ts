import { Logger } from '../core/Logger.js';
import { Alert } from '../types/index.js';

export interface NotificationConfig {
  telegram: {
    botToken: string;
    chatId: string;
    enabled: boolean;
  };
  email: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    username: string;
    password: string;
    from: string;
    to: string;
  };
  desktop: {
    enabled: boolean;
  };
}

export class NotificationService {
  private static instance: NotificationService;
  private logger = Logger.getInstance();
  private config: NotificationConfig = {
    telegram: {
      botToken: '',
      chatId: '',
      enabled: false
    },
    email: {
      enabled: false,
      smtpHost: '',
      smtpPort: 587,
      username: '',
      password: '',
      from: '',
      to: ''
    },
    desktop: {
      enabled: true
    }
  };

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  updateConfig(config: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Notification config updated');
  }

  async sendAlert(alert: Alert): Promise<void> {
    const message = this.formatAlertMessage(alert);

    try {
      if (this.config.desktop.enabled) {
        await this.sendDesktopNotification(message, alert.priority);
      }

      if (this.config.telegram.enabled && this.config.telegram.botToken) {
        await this.sendTelegramMessage(message);
      }

      if (this.config.email.enabled) {
        await this.sendEmailNotification(message, alert);
      }

      this.logger.info('Alert notification sent', { alertId: alert.id });
    } catch (error) {
      this.logger.error('Failed to send alert notification', { alertId: alert.id }, error as Error);
    }
  }

  private formatAlertMessage(alert: Alert): string {
    const timestamp = new Date(alert.triggerTime || Date.now()).toLocaleString();
    return `🚨 BOLT AI Alert - ${alert.priority}

Symbol: ${alert.symbol}
Type: ${alert.type}
Condition: ${alert.condition}
Current Value: ${alert.currentValue}
Threshold: ${alert.threshold}
Time: ${timestamp}

Message: ${alert.message}`;
  }

  private async sendDesktopNotification(message: string, priority: string): Promise<void> {
    // In a real desktop app, this would use Windows Toast notifications
    this.logger.info(`Desktop Notification [${priority}]: ${message}`);
  }

  private async sendTelegramMessage(message: string): Promise<void> {
    try {
      const url = `https://api.telegram.org/bot${this.config.telegram.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config.telegram.chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });

      if (!response.ok) {
        console.error(`Telegram API error: ${response.statusText}`);
      }

      this.logger.info('Telegram notification sent successfully');
    } catch (error) {
      this.logger.error('Failed to send Telegram notification', {}, error as Error);
      throw error;
    }
  }

  private async sendEmailNotification(message: string, alert: Alert): Promise<void> {
    // Email implementation would go here
    this.logger.info('Email notification would be sent', { alertId: alert.id });
  }

  async sendSystemNotification(title: string, message: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'): Promise<void> {
    try {
      if (this.config.desktop.enabled) {
        await this.sendDesktopNotification(`${title}\n\n${message}`, priority);
      }

      if (this.config.telegram.enabled && priority === 'CRITICAL') {
        await this.sendTelegramMessage(`🔥 ${title}\n\n${message}`);
      }

      this.logger.info('System notification sent', { title, priority });
    } catch (error) {
      this.logger.error('Failed to send system notification', { title }, error as Error);
    }
  }
}