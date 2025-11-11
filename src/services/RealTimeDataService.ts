/**
 * REAL-TIME DATA SERVICE - 100% REAL DATA
 * WebSocket service for live market data streaming
 */

import { Logger } from '../core/Logger.js';
import { wsUrl } from '../lib/ws';

export interface RealTimeUpdate {
  type: 'price_update' | 'whale_alert' | 'signal_generated' | 'sentiment_update';
  data: any;
  timestamp: number;
}

export class RealTimeDataService {
  private static instance: RealTimeDataService;
  private logger = Logger.getInstance();
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  private constructor() {}

  static getInstance(): RealTimeDataService {
    if (!RealTimeDataService.instance) {
      RealTimeDataService.instance = new RealTimeDataService();
    }
    return RealTimeDataService.instance;
  }

  /**
   * Connect to real-time WebSocket data stream
   */
  connectToRealTimeData(url: string = wsUrl('/ws')): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.logger.info('WebSocket already connected');
      return;
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.logger.info('WebSocket connected to real-time data stream');
        this.reconnectAttempts = 0;

        // Subscribe to all real-time data streams
        this.ws?.send(JSON.stringify({
          type: 'subscribe',
          streams: ['prices', 'whales', 'signals', 'sentiment']
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const realTimeData: RealTimeUpdate = JSON.parse(event.data);
          this.handleRealTimeData(realTimeData);
        } catch (error) {
          this.logger.error('Failed to parse WebSocket message', {}, error as Error);
        }
      };

      this.ws.onerror = (error) => {
        this.logger.error('WebSocket error', {}, error as any);
      };

      this.ws.onclose = () => {
        this.logger.warn('WebSocket disconnected');
        this.attemptReconnect(url);
      };

    } catch (error) {
      this.logger.error('Failed to connect WebSocket', {}, error as Error);
      this.attemptReconnect(url);
    }
  }

  /**
   * Handle incoming real-time data
   */
  private handleRealTimeData(data: RealTimeUpdate): void {
    switch (data.type) {
      case 'price_update':
        this.notifySubscribers('price', data.data);
        break;
      case 'whale_alert':
        this.notifySubscribers('whale', data.data);
        break;
      case 'signal_generated':
        this.notifySubscribers('signal', data.data);
        break;
      case 'sentiment_update':
        this.notifySubscribers('sentiment', data.data);
        break;
      default:
        this.logger.warn('Unknown real-time data type', { type: data.type });
    }
  }

  /**
   * Subscribe to specific data stream
   */
  subscribe(stream: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(stream)) {
      this.subscribers.set(stream, new Set());
    }
    
    this.subscribers.get(stream)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(stream)?.delete(callback);
    };
  }

  /**
   * Notify all subscribers of a stream
   */
  private notifySubscribers(stream: string, data: any): void {
    const callbacks = this.subscribers.get(stream);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.logger.error('Subscriber callback error', { stream }, error as Error);
        }
      });
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(url: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    this.logger.info(`Attempting reconnect in ${delay}ms`, {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    });

    setTimeout(() => {
      this.connectToRealTimeData(url);
    }, delay);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.logger.info('WebSocket disconnected');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Update price displays with real-time data
   */
  updatePriceDisplays(data: any): void {
    this.notifySubscribers('price', data);
  }

  /**
   * Update whale tracker with real-time data
   */
  updateWhaleTracker(data: any): void {
    this.notifySubscribers('whale', data);
  }

  /**
   * Update signal feed with real-time data
   */
  updateSignalFeed(data: any): void {
    this.notifySubscribers('signal', data);
  }

  /**
   * Update sentiment indicators with real-time data
   */
  updateSentimentIndicators(data: any): void {
    this.notifySubscribers('sentiment', data);
  }
}
