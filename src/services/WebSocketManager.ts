/**
 * WebSocketManager - Unified WebSocket Connection Manager
 * 
 * Prevents multiple WebSocket connections by providing a singleton instance
 * that multiplexes messages to multiple subscribers.
 * 
 * Features:
 * - Single WebSocket connection for entire app
 * - Topic-based subscription system
 * - Automatic reconnection with exponential backoff
 * - Connection state management
 * - HuggingFace compatible (WSS support)
 */

import { buildWebSocketUrl } from '../config/env';
import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

type MessageHandler = (data: any) => void;
type ConnectionStateHandler = (connected: boolean) => void;

interface Subscription {
  id: string;
  topic: string;
  handler: MessageHandler;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private connectionStateHandlers: Set<ConnectionStateHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionalClose = false;
  private messageQueue: any[] = [];
  private isConnected = false;

  private constructor() {
    // Singleton - use getInstance()
  }

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Connect to WebSocket server
   * If already connected, does nothing
   */
  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      logger.info('WebSocket already connected or connecting');
      return;
    }

    try {
      const wsUrl = buildWebSocketUrl('/ws');
      logger.info('Connecting to WebSocket:', { url: wsUrl });

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        logger.info('✅ WebSocket connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.notifyConnectionState(true);
        this.flushMessageQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          logger.error('Failed to parse WebSocket message', {}, error as Error);
        }
      };

      this.ws.onerror = (error) => {
        logger.error('WebSocket error', {}, new Error('WebSocket connection error'));
        this.isConnected = false;
        this.notifyConnectionState(false);
      };

      this.ws.onclose = (event) => {
        logger.info('WebSocket closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        this.isConnected = false;
        this.notifyConnectionState(false);

        // Auto-reconnect unless it was an intentional close
        if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      logger.error('Failed to create WebSocket connection', {}, error as Error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   * Prevents auto-reconnect
   */
  disconnect(): void {
    this.isIntentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.notifyConnectionState(false);
  }

  /**
   * Subscribe to WebSocket messages for a specific topic
   * @param topic Topic/channel to subscribe to (e.g., 'prices', 'positions', 'signals')
   * @param handler Callback function to handle messages
   * @returns Subscription ID for later unsubscribe
   */
  subscribe(topic: string, handler: MessageHandler): string {
    const id = `${topic}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscriptions.set(id, { id, topic, handler });
    
    // Ensure connected
    if (!this.isConnected) {
      this.connect();
    }

    // Send subscription message to server
    this.send({
      type: 'subscribe',
      topic
    });

    logger.debug('Subscribed to WebSocket topic', { topic, id });
    return id;
  }

  /**
   * Unsubscribe from WebSocket messages
   * @param subscriptionId Subscription ID returned from subscribe()
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      this.subscriptions.delete(subscriptionId);
      
      // Send unsubscribe message to server
      this.send({
        type: 'unsubscribe',
        topic: subscription.topic
      });

      logger.debug('Unsubscribed from WebSocket topic', { 
        topic: subscription.topic, 
        id: subscriptionId 
      });
    }
  }

  /**
   * Subscribe to connection state changes
   */
  onConnectionStateChange(handler: ConnectionStateHandler): () => void {
    this.connectionStateHandlers.add(handler);
    // Immediately notify of current state
    handler(this.isConnected);
    // Return unsubscribe function
    return () => {
      this.connectionStateHandlers.delete(handler);
    };
  }

  /**
   * Send message to server
   */
  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Queue message for when connection is ready
      this.messageQueue.push(data);
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: any): void {
    // Notify all subscriptions that match the message type/topic
    const topic = data.type || 'default';
    
    for (const subscription of this.subscriptions.values()) {
      if (subscription.topic === topic || subscription.topic === '*') {
        try {
          subscription.handler(data);
        } catch (error) {
          logger.error('Error in subscription handler', { topic }, error as Error);
        }
      }
    }
  }

  /**
   * Notify all connection state handlers
   */
  private notifyConnectionState(connected: boolean): void {
    for (const handler of this.connectionStateHandlers) {
      try {
        handler(connected);
      } catch (error) {
        logger.error('Error in connection state handler', {}, error as Error);
      }
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    logger.info(`Scheduling WebSocket reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.isIntentionalClose = false;
      this.connect();
    }, delay);
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

// Export singleton instance
export const wsManager = WebSocketManager.getInstance();
