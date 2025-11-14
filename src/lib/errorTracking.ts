/**
 * Error Tracking - Centralized error logging and analytics
 *
 * Features:
 * - Categorize errors (network, validation, server, client)
 * - Track error frequency and patterns
 * - Store recent errors with context
 * - Integration with external services (Sentry, LogRocket, etc.)
 * - Error recovery tracking
 *
 * @example
 * ```ts
 * errorTracker.track({
 *   type: 'network',
 *   message: 'Failed to fetch OHLC data',
 *   context: {
 *     component: 'useOHLC',
 *     action: 'fetchData',
 *     symbol: 'BTC/USDT'
 *   }
 * });
 * ```
 */

export type ErrorType = 'network' | 'validation' | 'server' | 'client' | 'unknown';

export interface ErrorContext {
  component: string;
  action: string;
  timestamp?: number;
  userAgent?: string;
  [key: string]: any; // Allow additional context fields
}

export interface ErrorEvent {
  id: string;
  type: ErrorType;
  message: string;
  context: ErrorContext;
  stack?: string;
  timestamp: number;
  recovered?: boolean; // Whether error was recovered from (e.g., retry succeeded)
}

export interface ErrorStats {
  totalErrors: number;
  byType: Record<ErrorType, number>;
  byComponent: Record<string, number>;
  recoveryRate: number;
  recentErrors: ErrorEvent[];
}

class ErrorTracker {
  private errors: ErrorEvent[] = [];
  private maxErrors: number = 100;
  private recoveryAttempts = new Map<string, { attempts: number; successes: number }>();

  /**
   * Track an error event
   */
  track(event: Omit<ErrorEvent, 'id' | 'timestamp'>): void {
    const errorEvent: ErrorEvent = {
      ...event,
      id: this.generateErrorId(),
      timestamp: Date.now(),
      context: {
        ...event.context,
        timestamp: event.context.timestamp || Date.now(),
        userAgent: event.context.userAgent || navigator.userAgent
      }
    };

    // Add to errors list
    this.errors.push(errorEvent);

    // Enforce max size (FIFO)
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      const emoji = this.getErrorEmoji(errorEvent.type);
      console.warn(
        `${emoji} [ErrorTracker] ${errorEvent.type.toUpperCase()}:`,
        errorEvent.message,
        '\nContext:', errorEvent.context,
        errorEvent.stack ? `\nStack: ${errorEvent.stack}` : ''
      );
    }

    // Optional: Send to external service (Sentry, LogRocket, etc.)
    this.sendToExternalService(errorEvent);
  }

  /**
   * Track error recovery (e.g., successful retry after error)
   */
  trackRecovery(component: string, action: string): void {
    const key = `${component}:${action}`;
    const stats = this.recoveryAttempts.get(key) || { attempts: 0, successes: 0 };
    stats.successes++;
    this.recoveryAttempts.set(key, stats);

    // Mark recent errors from this component/action as recovered
    this.errors
      .filter(e => e.context.component === component && e.context.action === action)
      .forEach(e => e.recovered = true);
  }

  /**
   * Track recovery attempt (e.g., retry attempt)
   */
  trackRecoveryAttempt(component: string, action: string): void {
    const key = `${component}:${action}`;
    const stats = this.recoveryAttempts.get(key) || { attempts: 0, successes: 0 };
    stats.attempts++;
    this.recoveryAttempts.set(key, stats);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): ErrorEvent[] {
    return this.errors.slice(-limit).reverse();
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: ErrorType): ErrorEvent[] {
    return this.errors.filter(e => e.type === type);
  }

  /**
   * Get errors by component
   */
  getErrorsByComponent(component: string): ErrorEvent[] {
    return this.errors.filter(e => e.context.component === component);
  }

  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    const byType: Record<ErrorType, number> = {
      network: 0,
      validation: 0,
      server: 0,
      client: 0,
      unknown: 0
    };

    const byComponent: Record<string, number> = {};

    this.errors.forEach(error => {
      byType[error.type]++;
      const component = error.context.component;
      byComponent[component] = (byComponent[component] || 0) + 1;
    });

    // Calculate recovery rate
    let totalAttempts = 0;
    let totalSuccesses = 0;
    this.recoveryAttempts.forEach(stats => {
      totalAttempts += stats.attempts;
      totalSuccesses += stats.successes;
    });

    const recoveryRate = totalAttempts > 0
      ? (totalSuccesses / totalAttempts) * 100
      : 0;

    return {
      totalErrors: this.errors.length,
      byType,
      byComponent,
      recoveryRate,
      recentErrors: this.getRecentErrors(10)
    };
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors = [];
    this.recoveryAttempts.clear();
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get emoji for error type
   */
  private getErrorEmoji(type: ErrorType): string {
    const emojiMap: Record<ErrorType, string> = {
      network: '🌐',
      validation: '✅',
      server: '🔴',
      client: '⚠️',
      unknown: '❓'
    };
    return emojiMap[type] || '❓';
  }

  /**
   * Send error to external service (placeholder)
   */
  private sendToExternalService(error: ErrorEvent): void {
    // Placeholder for integration with Sentry, LogRocket, etc.
    // Example:
    // if (window.Sentry) {
    //   window.Sentry.captureException(new Error(error.message), {
    //     tags: {
    //       type: error.type,
    //       component: error.context.component
    //     },
    //     extra: error.context
    //   });
    // }
  }

  /**
   * Export errors as JSON (for debugging or reporting)
   */
  exportErrors(): string {
    return JSON.stringify({
      errors: this.errors,
      stats: this.getStats(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

/**
 * Classify error type from error object
 */
export function classifyError(error: any): ErrorType {
  const message = error?.message || String(error);
  const status = error?.response?.status || error?.status;

  // Network errors
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('NetworkError') ||
    message.includes('timeout') ||
    message.includes('AbortError')
  ) {
    return 'network';
  }

  // Server errors (5xx)
  if (status && status >= 500 && status < 600) {
    return 'server';
  }

  // Client errors (4xx)
  if (status && status >= 400 && status < 500) {
    return 'client';
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return 'validation';
  }

  return 'unknown';
}

export default errorTracker;
