/**
 * BootstrapOrchestrator - Centralized startup data loading coordinator
 *
 * This service prevents request storms by:
 * 1. Ensuring only one bootstrap happens
 * 2. Rate limiting requests during startup
 * 3. Implementing progressive loading (core data first, then secondary)
 * 4. Providing request budgeting
 */

import { Logger } from '../core/Logger.js';

export interface BootstrapState {
  isBootstrapping: boolean;
  isBootstrapComplete: boolean;
  lastBootstrapTime: number;
  requestCount: number;
  coreDataLoaded: boolean;
}

export interface BootstrapConfig {
  // Minimum time between bootstraps (default 30 seconds)
  minBootstrapInterval: number;
  // Maximum concurrent requests during bootstrap (default 3)
  maxConcurrentRequests: number;
  // Delay between request batches in ms (default 500ms)
  batchDelay: number;
  // Enable progressive loading (core first, then secondary)
  progressiveLoading: boolean;
}

type BootstrapListener = (state: BootstrapState) => void;

class BootstrapOrchestratorClass {
  private static instance: BootstrapOrchestratorClass;
  private readonly logger = Logger.getInstance();

  private state: BootstrapState = {
    isBootstrapping: false,
    isBootstrapComplete: false,
    lastBootstrapTime: 0,
    requestCount: 0,
    coreDataLoaded: false,
  };

  private config: BootstrapConfig = {
    minBootstrapInterval: 30000, // 30 seconds
    maxConcurrentRequests: 3,
    batchDelay: 500, // 500ms between batches
    progressiveLoading: true,
  };

  private listeners: Set<BootstrapListener> = new Set();
  private bootstrapPromise: Promise<void> | null = null;
  private activeRequests: number = 0;
  private requestQueue: Array<() => Promise<any>> = [];
  private processingQueue: boolean = false;

  private constructor() {}

  static getInstance(): BootstrapOrchestratorClass {
    if (!BootstrapOrchestratorClass.instance) {
      BootstrapOrchestratorClass.instance = new BootstrapOrchestratorClass();
    }
    return BootstrapOrchestratorClass.instance;
  }

  /**
   * Update orchestrator configuration
   */
  configure(config: Partial<BootstrapConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('BootstrapOrchestrator configured', { config: this.config });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: BootstrapListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  private updateState(updates: Partial<BootstrapState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Check if bootstrap should be allowed
   */
  canBootstrap(): boolean {
    // If already bootstrapping, don't allow another
    if (this.state.isBootstrapping) {
      this.logger.info('Bootstrap already in progress, skipping');
      return false;
    }

    // Check minimum interval between bootstraps
    const timeSinceLastBootstrap = Date.now() - this.state.lastBootstrapTime;
    if (this.state.isBootstrapComplete && timeSinceLastBootstrap < this.config.minBootstrapInterval) {
      this.logger.info('Bootstrap throttled, too soon since last bootstrap', {
        timeSinceLastBootstrap,
        minInterval: this.config.minBootstrapInterval,
      });
      return false;
    }

    return true;
  }

  /**
   * Check if initial load should be disabled (respects env flags)
   */
  isInitialLoadDisabled(): boolean {
    const disableFlag = import.meta.env.VITE_DISABLE_INITIAL_LOAD;
    // Handle both string and boolean forms from environment
    return disableFlag === 'true' || disableFlag === 'TRUE' || String(disableFlag) === 'true';
  }

  /**
   * Queue a request to be executed with rate limiting
   */
  async queueRequest<T>(requestFn: () => Promise<T>, priority: 'high' | 'normal' = 'normal'): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedRequest = async () => {
        try {
          this.activeRequests++;
          this.updateState({ requestCount: this.state.requestCount + 1 });
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
        }
      };

      if (priority === 'high') {
        this.requestQueue.unshift(wrappedRequest);
      } else {
        this.requestQueue.push(wrappedRequest);
      }

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue) return;
    this.processingQueue = true;

    while (this.requestQueue.length > 0) {
      // Wait if we're at max concurrent requests
      if (this.activeRequests >= this.config.maxConcurrentRequests) {
        await this.sleep(100);
        continue;
      }

      const request = this.requestQueue.shift();
      if (request) {
        // Don't await here - let it run concurrently up to the limit
        request().catch(err => {
          this.logger.error('Queued request failed', {}, err);
        });
      }

      // Small delay between starting requests
      if (this.requestQueue.length > 0) {
        await this.sleep(50);
      }
    }

    this.processingQueue = false;
  }

  /**
   * Main bootstrap entry point - ensures only one bootstrap runs
   */
  async bootstrap(loadCoreFn: () => Promise<void>, loadSecondaryFn?: () => Promise<void>): Promise<void> {
    if (!this.canBootstrap()) {
      // If bootstrap already completed, return immediately
      if (this.state.isBootstrapComplete) {
        return Promise.resolve();
      }
      // If bootstrapping, wait for it to complete
      if (this.bootstrapPromise) {
        return this.bootstrapPromise;
      }
      return Promise.resolve();
    }

    // Check if initial load is disabled
    if (this.isInitialLoadDisabled()) {
      this.logger.info('Initial load disabled via VITE_DISABLE_INITIAL_LOAD flag');
      this.updateState({ isBootstrapComplete: true });
      return Promise.resolve();
    }

    this.bootstrapPromise = this.executeBootstrap(loadCoreFn, loadSecondaryFn);
    return this.bootstrapPromise;
  }

  private async executeBootstrap(
    loadCoreFn: () => Promise<void>,
    loadSecondaryFn?: () => Promise<void>
  ): Promise<void> {
    this.logger.info('Starting bootstrap sequence', { config: this.config });
    this.updateState({
      isBootstrapping: true,
      isBootstrapComplete: false,
      requestCount: 0,
    });

    try {
      // Phase 1: Load core data (essential for dashboard rendering)
      this.logger.info('Bootstrap Phase 1: Loading core data');
      await loadCoreFn();
      this.updateState({ coreDataLoaded: true });

      // Phase 2: Load secondary data with delay (optional, non-blocking)
      if (loadSecondaryFn && this.config.progressiveLoading) {
        this.logger.info('Bootstrap Phase 2: Scheduling secondary data load');
        // Delay secondary loads to spread out requests
        await this.sleep(this.config.batchDelay);
        await loadSecondaryFn();
      }

      this.logger.info('Bootstrap sequence completed', {
        totalRequests: this.state.requestCount,
        duration: Date.now() - this.state.lastBootstrapTime,
      });
    } catch (error) {
      this.logger.error('Bootstrap sequence failed', {}, error);
      // Even on error, mark as complete to prevent infinite retries
    } finally {
      this.updateState({
        isBootstrapping: false,
        isBootstrapComplete: true,
        lastBootstrapTime: Date.now(),
      });
      this.bootstrapPromise = null;
    }
  }

  /**
   * Reset bootstrap state (useful for testing or forced refresh)
   */
  reset(): void {
    this.logger.info('Resetting bootstrap state');
    this.state = {
      isBootstrapping: false,
      isBootstrapComplete: false,
      lastBootstrapTime: 0,
      requestCount: 0,
      coreDataLoaded: false,
    };
    this.bootstrapPromise = null;
    this.requestQueue = [];
    this.notifyListeners();
  }

  /**
   * Get current state
   */
  getState(): BootstrapState {
    return { ...this.state };
  }

  /**
   * Get current configuration
   */
  getConfig(): BootstrapConfig {
    return { ...this.config };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const BootstrapOrchestrator = BootstrapOrchestratorClass.getInstance();
