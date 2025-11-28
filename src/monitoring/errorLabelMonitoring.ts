/**
 * Error Label Monitoring
 * 
 * Centralized monitoring for all error labels.
 * Forwards errors to monitoring services (Sentry, custom log service, etc.)
 * and raises alerts for critical error patterns.
 */

import { Logger, LogLevel } from '../core/Logger.js';

const logger = Logger.getInstance();

interface ErrorEvent {
  timestamp: number;
  code: string;
  component: string;
  severity: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  metadata?: Record<string, any>;
}

interface AlertRule {
  code: string;
  threshold: number; // Number of occurrences
  window: number; // Time window in milliseconds
  severity: 'INFO' | 'WARN' | 'ERROR';
}

export class ErrorLabelMonitoring {
  private static instance: ErrorLabelMonitoring;
  private events: ErrorEvent[] = [];
  private readonly MAX_EVENTS = 10000; // Keep last 10k events in memory

  // Alert rules
  private readonly alertRules: AlertRule[] = [
    { code: 'AI_DATA_TOO_SMALL', threshold: 5, window: 5 * 60 * 1000, severity: 'WARN' },
    { code: 'KUCOIN_HEALTH_FAIL', threshold: 3, window: 5 * 60 * 1000, severity: 'ERROR' },
    { code: 'KUCOIN_UNAVAILABLE', threshold: 1, window: 5 * 60 * 1000, severity: 'ERROR' },
    { code: 'DISABLED_BY_CONFIG', threshold: 10, window: 10 * 60 * 1000, severity: 'INFO' },
    { code: 'INVALID_NEWS_API_KEY', threshold: 1, window: 5 * 60 * 1000, severity: 'ERROR' },
    { code: 'NEWS_API_FAIL:newsapi', threshold: 5, window: 5 * 60 * 1000, severity: 'WARN' },
    { code: 'NEWS_API_FAIL:all', threshold: 3, window: 5 * 60 * 1000, severity: 'ERROR' }
  ];

  private constructor() {
    // Clean up old events periodically
    setInterval(() => this.cleanupOldEvents(), 60 * 1000); // Every minute
  }

  static getInstance(): ErrorLabelMonitoring {
    if (!ErrorLabelMonitoring.instance) {
      ErrorLabelMonitoring.instance = new ErrorLabelMonitoring();
    }
    return ErrorLabelMonitoring.instance;
  }

  /**
   * Track an error event
   */
  trackError(event: Omit<ErrorEvent, 'timestamp'>): void {
    const fullEvent: ErrorEvent = {
      ...event,
      timestamp: Date.now()
    };

    // Add to events list
    this.events.push(fullEvent);

    // Trim if too many events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Log structured event
    const logLevel = event.severity === 'ERROR' ? LogLevel.ERROR : 
                     event.severity === 'WARN' ? LogLevel.WARN : 
                     LogLevel.INFO;
    
    if (event.severity === 'ERROR') {
      logger.error(event.code, event.metadata || {});
    } else if (event.severity === 'WARN') {
      logger.warn(event.code, event.metadata || {});
    } else {
      logger.info(event.code, event.metadata || {});
    }

    // Check alert rules
    this.checkAlertRules(fullEvent);

    // Forward to external monitoring (Sentry, etc.)
    this.forwardToMonitoring(fullEvent);
  }

  /**
   * Check if event triggers any alert rules
   */
  private checkAlertRules(event: ErrorEvent): void {
    const now = Date.now();

    for (const rule of this.alertRules) {
      // Skip if not matching code
      if (rule.code !== event.code) continue;

      // Count occurrences in time window
      const count = this.events.filter(e => 
        e.code === rule.code &&
        now - e.timestamp <= rule.window
      ).length;

      // Trigger alert if threshold exceeded
      if (count >= rule.threshold) {
        this.raiseAlert(rule, count);
      }
    }
  }

  /**
   * Raise an alert
   */
  private raiseAlert(rule: AlertRule, count: number): void {
    const alert = {
      timestamp: new Date().toISOString(),
      severity: rule.severity,
      code: rule.code,
      message: `Alert: ${rule.code} occurred ${count} times in last ${rule.window / 1000}s`,
      threshold: rule.threshold,
      count
    };

    logger.error('ALERT_TRIGGERED', alert);

    // TODO: Send to alerting system (PagerDuty, Slack, email, etc.)
    // For now, just log
    console.error(JSON.stringify({
      type: 'ALERT',
      ...alert
    }));
  }

  /**
   * Forward event to external monitoring service
   */
  private forwardToMonitoring(event: ErrorEvent): void {
    // TODO: Integrate with Sentry, DataDog, or custom monitoring service
    
    // Example Sentry integration:
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.captureException(new Error(event.message), {
    //     tags: {
    //       errorCode: event.code,
    //       component: event.component
    //     },
    //     extra: event.metadata
    //   });
    // }

    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify({
        type: 'ERROR_EVENT',
        ...event
      }));
    }
  }

  /**
   * Clean up events older than 1 hour
   */
  private cleanupOldEvents(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const before = this.events.length;
    this.events = this.events.filter(e => e.timestamp > oneHourAgo);
    const removed = before - this.events.length;
    
    if (removed > 0) {
      logger.debug(`Cleaned up ${removed} old error events`);
    }
  }

  /**
   * Get error statistics
   */
  getStats(timeWindow: number = 60 * 60 * 1000): Record<string, any> {
    const now = Date.now();
    const recentEvents = this.events.filter(e => now - e.timestamp <= timeWindow);

    const stats: Record<string, any> = {
      totalEvents: recentEvents.length,
      timeWindow: timeWindow / 1000, // in seconds
      byCode: {},
      bySeverity: {
        INFO: 0,
        WARN: 0,
        ERROR: 0
      }
    };

    for (const event of recentEvents) {
      // Count by code
      if (!stats.byCode[event.code]) {
        stats.byCode[event.code] = 0;
      }
      stats.byCode[event.code]++;

      // Count by severity
      stats.bySeverity[event.severity]++;
    }

    return stats;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 100): ErrorEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Clear all events (for testing)
   */
  clear(): void {
    this.events = [];
    logger.info('Cleared all error monitoring events');
  }
}

export const errorMonitoring = ErrorLabelMonitoring.getInstance();

// Export convenience function
export function trackError(
  code: string,
  component: string,
  message: string,
  severity: 'INFO' | 'WARN' | 'ERROR' = 'ERROR',
  metadata?: Record<string, any>
): void {
  errorMonitoring.trackError({
    code,
    component,
    severity,
    message,
    metadata
  });
}
