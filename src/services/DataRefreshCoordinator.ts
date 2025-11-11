/**
 * DataRefreshCoordinator - Consolidates multiple polling intervals into a single coordinated refresh cycle
 *
 * Problem: Previously, 6+ different components were polling every 30 seconds independently,
 * causing 12+ API requests per minute for the same data.
 *
 * Solution: Single refresh cycle that all components subscribe to, reducing duplicate requests.
 */

import { Logger } from '../core/Logger.js';
const logger = Logger.getInstance();

type DataType = 'signals' | 'portfolio' | 'marketData' | 'health';
type CallbackFunction = () => Promise<void> | void;

interface Subscription {
  id: string;
  dataType: DataType;
  callback: CallbackFunction;
  lastRun?: number;
}

interface CoordinatorConfig {
  // Refresh interval in milliseconds (default: 60 seconds, increased from 30s)
  refreshInterval?: number;
  // Minimum time between calls for same data type (prevents duplicate fetches)
  minCallInterval?: number;
  // Enable debug logging
  debug?: boolean;
}

export class DataRefreshCoordinator {
  private static instance: DataRefreshCoordinator;
  private subscribers: Map<string, Subscription> = new Map();
  private intervalId?: NodeJS.Timeout;
  private config: Required<CoordinatorConfig>;
  private lastFetch: Map<DataType, number> = new Map();
  private isRunning = false;

  private constructor(config: CoordinatorConfig = {}) {
    this.config = {
      refreshInterval: config.refreshInterval || 60000, // 60 seconds instead of 30
      minCallInterval: config.minCallInterval || 5000, // 5 seconds minimum between same type
      debug: config.debug || false,
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: CoordinatorConfig): DataRefreshCoordinator {
    if (!DataRefreshCoordinator.instance) {
      DataRefreshCoordinator.instance = new DataRefreshCoordinator(config);
    }
    return DataRefreshCoordinator.instance;
  }

  /**
   * Subscribe to coordinated data refresh
   * @param dataType - Type of data to fetch
   * @param callback - Function to call on refresh
   * @returns Subscription ID for unsubscribing
   */
  public subscribe(dataType: DataType, callback: CallbackFunction): string {
    const id = `${dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const subscription: Subscription = {
      id,
      dataType,
      callback,
    };

    this.subscribers.set(id, subscription);

    if (this.config.debug) {
      logger.debug(`DataRefreshCoordinator: New subscription ${id} for ${dataType}`);
      logger.debug(`Total subscribers: ${this.subscribers.size}`);
    }

    // Start interval if not running
    if (!this.isRunning) {
      this.start();
    }

    // Immediately call the callback on first subscription
    this.executeCallback(subscription).catch((error) => {
      logger.error(`Error in initial callback for ${id}:`, error);
    });

    return id;
  }

  /**
   * Unsubscribe from data refresh
   */
  public unsubscribe(subscriptionId: string): void {
    const removed = this.subscribers.delete(subscriptionId);

    if (this.config.debug && removed) {
      logger.debug(`DataRefreshCoordinator: Unsubscribed ${subscriptionId}`);
      logger.debug(`Remaining subscribers: ${this.subscribers.size}`);
    }

    // Stop interval if no more subscribers
    if (this.subscribers.size === 0) {
      this.stop();
    }
  }

  /**
   * Start the refresh interval
   */
  private start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.refresh();
    }, this.config.refreshInterval);

    logger.info(
      `DataRefreshCoordinator started with ${this.config.refreshInterval}ms interval`
    );
  }

  /**
   * Stop the refresh interval
   */
  private stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      this.isRunning = false;
      logger.info('DataRefreshCoordinator stopped');
    }
  }

  /**
   * Force immediate refresh (useful for manual updates)
   */
  public forceRefresh(dataType?: DataType): void {
    this.refresh(dataType);
  }

  /**
   * Main refresh logic - groups callbacks by data type to prevent duplicates
   */
  private async refresh(specificType?: DataType): Promise<void> {
    const now = Date.now();

    // Group subscriptions by data type
    const groupedByType = new Map<DataType, Subscription[]>();

    for (const subscription of this.subscribers.values()) {
      if (specificType && subscription.dataType !== specificType) {
        continue;
      }

      const list = groupedByType.get(subscription.dataType) || [];
      list.push(subscription);
      groupedByType.set(subscription.dataType, list);
    }

    // Execute one callback per data type (prevents duplicate fetches)
    for (const [dataType, subscriptions] of groupedByType.entries()) {
      const lastFetch = this.lastFetch.get(dataType) || 0;
      const timeSinceLastFetch = now - lastFetch;

      // Skip if we fetched this data type too recently
      if (timeSinceLastFetch < this.config.minCallInterval) {
        if (this.config.debug) {
          logger.debug(
            `Skipping ${dataType} - last fetch was ${timeSinceLastFetch}ms ago`
          );
        }
        continue;
      }

      // Execute only the first subscription for each data type
      // All components get the same cached data
      const subscription = subscriptions[0];

      try {
        await this.executeCallback(subscription);
        this.lastFetch.set(dataType, Date.now());

        if (this.config.debug) {
          logger.debug(
            `Refreshed ${dataType} (${subscriptions.length} subscribers using same data)`
          );
        }
      } catch (error) {
        logger.error(`Error refreshing ${dataType}:`, error);
      }
    }
  }

  /**
   * Execute a single callback with error handling
   */
  private async executeCallback(subscription: Subscription): Promise<void> {
    try {
      await subscription.callback();
      subscription.lastRun = Date.now();
    } catch (error) {
      logger.error(`Error in subscription ${subscription.id}:`, error);
      throw error;
    }
  }

  /**
   * Get statistics about current subscriptions
   */
  public getStats(): {
    totalSubscribers: number;
    byType: Record<DataType, number>;
    isRunning: boolean;
    refreshInterval: number;
  } {
    const byType: Record<string, number> = {};

    for (const subscription of this.subscribers.values()) {
      byType[subscription.dataType] = (byType[subscription.dataType] || 0) + 1;
    }

    return {
      totalSubscribers: this.subscribers.size,
      byType: byType as Record<DataType, number>,
      isRunning: this.isRunning,
      refreshInterval: this.config.refreshInterval,
    };
  }

  /**
   * Update configuration (e.g., change refresh interval)
   */
  public updateConfig(config: Partial<CoordinatorConfig>): void {
    const needsRestart = config.refreshInterval &&
                        config.refreshInterval !== this.config.refreshInterval;

    Object.assign(this.config, config);

    if (needsRestart && this.isRunning) {
      this.stop();
      this.start();
      logger.info(`DataRefreshCoordinator restarted with new interval: ${this.config.refreshInterval}ms`);
    }
  }

  /**
   * Cleanup all subscriptions and stop
   */
  public destroy(): void {
    this.stop();
    this.subscribers.clear();
    this.lastFetch.clear();
    logger.info('DataRefreshCoordinator destroyed');
  }
}

// Export singleton instance
export const dataRefreshCoordinator = DataRefreshCoordinator.getInstance({
  refreshInterval: 60000, // 60 seconds (reduced from 30s)
  minCallInterval: 5000,   // 5 seconds minimum between same data type
  debug: process.env.NODE_ENV === 'development',
});
