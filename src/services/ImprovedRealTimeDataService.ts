// src/services/ImprovedRealTimeDataService.ts

/**
 * Improved Real-Time Data Service with WebSocket
 * 
 * Fixes:
 * - Race condition in connection handling
 * - Memory leaks from event listeners
 * - Proper reconnection logic
 * - Better error handling
 */

import WebSocket from 'ws';
import { Logger } from '../core/Logger.js';
import { EventEmitter } from 'events';
import { wsUrl } from '../lib/ws';

export interface RealTimeDataServiceOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
}

type SubscriptionCallback = (data: any) => void;

export class ImprovedRealTimeDataService extends EventEmitter {
  private static instance: ImprovedRealTimeDataService;
  private readonly logger = Logger.getInstance();
  
  // WebSocket
  private ws: WebSocket | null = null;
  private wsUrl: string;
  
  // Connection state
  private connected = false;
  private connecting = false;
  private connectionPromise: Promise<void> | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = true;
  
  // Configuration
  private readonly reconnectInterval: number;
  private readonly maxReconnectAttempts: number;
  private readonly heartbeatInterval: number;
  private readonly connectionTimeout: number;
  
  // Timers
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionTimeoutTimer: NodeJS.Timeout | null = null;
  
  // Subscriptions
  private subscriptions = new Map<string, Set<SubscriptionCallback>>();

  private constructor(options: RealTimeDataServiceOptions = {}) {
    super();
    this.wsUrl = options.url || wsUrl('/ws');
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.connectionTimeout = options.connectionTimeout || 10000;
  }

  static getInstance(options?: RealTimeDataServiceOptions): ImprovedRealTimeDataService {
    if (!ImprovedRealTimeDataService.instance) {
      ImprovedRealTimeDataService.instance = new ImprovedRealTimeDataService(options);
    }
    return ImprovedRealTimeDataService.instance;
  }

  /**
   * Connect to WebSocket server
   * Prevents multiple simultaneous connection attempts
   */
  async connect(url?: string): Promise<void> {
    if (url) {
      this.wsUrl = url;
    }

    // اگر در حال connecting است، همان promise را برگردان
    if (this.connecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    // اگر قبلاً connected است، مستقیم برگردان
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    // شروع connection جدید
    this.connecting = true;
    this.connectionPromise = this._connect();
    
    try {
      await this.connectionPromise;
    } finally {
      this.connecting = false;
      this.connectionPromise = null;
    }
  }

  /**
   * Internal connection logic
   */
  private async _connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.logger.info('Connecting to WebSocket', { url: this.wsUrl });

        // بستن connection قبلی در صورت وجود
        this.cleanup();

        // ایجاد connection جدید
        this.ws = new WebSocket(this.wsUrl);

        // تنظیم timeout برای connection
        this.connectionTimeoutTimer = setTimeout(() => {
          if (!this.connected) {
            this.logger.error('Connection timeout');
            this.ws?.terminate();
            reject(new Error('Connection timeout'));
          }
        }, this.connectionTimeout);

        // Event handlers
        this.ws.on('open', () => {
          if (this.connectionTimeoutTimer) {
            clearTimeout(this.connectionTimeoutTimer);
            this.connectionTimeoutTimer = null;
          }

          this.connected = true;
          this.reconnectAttempts = 0;
          
          this.logger.info('WebSocket connected');
          this.emit('connected');
          
          // شروع heartbeat
          this.startHeartbeat();
          
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            this.logger.error('Failed to parse WebSocket message', {}, error);
          }
        });

        this.ws.on('error', (error) => {
          this.logger.error('WebSocket error', {}, error);
          this.emit('error', error);
          
          if (!this.connected) {
            reject(error);
          }
        });

        this.ws.on('close', (code, reason) => {
          this.logger.warn('WebSocket closed', { 
            code, 
            reason: reason.toString() 
          });
          
          this.connected = false;
          this.emit('disconnected', { code, reason });
          
          // پاک کردن timers
          this.stopHeartbeat();
          
          // تلاش برای reconnect
          if (this.shouldReconnect) {
            this.scheduleReconnect();
          }
        });

      } catch (error) {
        this.logger.error('Failed to create WebSocket connection', {}, error);
        reject(error);
      }
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: any): void {
    if (message.type === 'pong') {
      // Heartbeat response
      return;
    }

    // ارسال به subscribers
    const stream = message.stream || message.type;
    if (stream && this.subscriptions.has(stream)) {
      const callbacks = this.subscriptions.get(stream)!;
      callbacks.forEach(callback => {
        try {
          callback(message.data || message);
        } catch (error) {
          this.logger.error('Error in subscription callback', {}, error);
        }
      });
    }

    // Emit global event
    this.emit('message', message);
  }

  /**
   * Connect to real-time data (alias for connect method)
   */
  async connectToRealTimeData(url?: string): Promise<void> {
    return this.connect(url);
  }

  /**
   * Subscribe to a stream
   */
  subscribe(stream: string, callback: SubscriptionCallback): () => void {
    if (!this.subscriptions.has(stream)) {
      this.subscriptions.set(stream, new Set());
    }

    this.subscriptions.get(stream)!.add(callback);

    this.logger.info('Subscribed to stream', { stream });

    // ارسال subscribe message به سرور
    if (this.connected) {
      this.send({
        type: 'subscribe',
        stream
      });
    }

    // بازگرداندن unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(stream);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(stream);
          
          // ارسال unsubscribe message به سرور
          if (this.connected) {
            this.send({
              type: 'unsubscribe',
              stream
            });
          }
        }
      }
    };
  }

  /**
   * Send data through WebSocket
   */
  send(data: any): void {
    if (!this.connected || !this.ws) {
      this.logger.warn('Cannot send data: WebSocket not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      this.logger.error('Failed to send WebSocket message', {}, error);
    }
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.connected && this.ws) {
        this.send({ type: 'ping' });
      }
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // already scheduled
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached');
      this.emit('max_reconnect_attempts');
      return;
    }

    this.reconnectAttempts++;
    
    const delay = Math.min(
      this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      60000 // max 1 minute
    );

    this.logger.info('Scheduling reconnect', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delayMs: delay
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(error => {
        this.logger.error('Reconnect failed', {}, error);
      });
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.shouldReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.cleanup();
    
    this.logger.info('WebSocket disconnected by user');
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.stopHeartbeat();
    
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        this.ws.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
      this.ws = null;
    }

    this.connected = false;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getState(): {
    connected: boolean;
    connecting: boolean;
    reconnectAttempts: number;
    subscriptions: number;
  } {
    return {
      connected: this.connected,
      connecting: this.connecting,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: this.subscriptions.size
    };
  }

  /**
   * Enable reconnection
   */
  enableReconnect(): void {
    this.shouldReconnect = true;
  }

  /**
   * Disable reconnection
   */
  disableReconnect(): void {
    this.shouldReconnect = false;
  }
}

/**
 * Example Usage:
 * 
 * const service = ImprovedRealTimeDataService.getInstance({
 *   url: 'ws://localhost:3001',
 *   reconnectInterval: 5000,
 *   maxReconnectAttempts: 10
 * });
 * 
 * await service.connect();
 * 
 * const unsubscribe = service.subscribe('prices', (data) => {
 *   console.log('Price update:', data);
 * });
 * 
 * // Later...
 * unsubscribe();
 * service.disconnect();
 */
