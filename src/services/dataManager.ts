import { AdvancedCache } from '../utils/cache';
import { Logger } from '../core/Logger.js';
import { ConnectionStatus } from '../types';
import { retry } from '../utils/retry';

import { API_BASE, WS_BASE } from '../config/env.js';

// API Base URL configuration
const API_BASE_URL = API_BASE;

// WebSocket connection configuration - use only /ws path (server supports /ws only)
const WS_PATH = '/ws';
// Note: buildWebSocketUrl() handles normalization internally, so we don't need normalizeWsBase here
// Keeping WS_BASE_NORMALIZED for backward compatibility but using buildWebSocketUrl() for new connections
const normalizeWsBase = (base: string): string => {
  // Remove ALL trailing /ws or /ws/ patterns (with optional trailing slash)
  // Use a while loop to handle multiple /ws suffixes
  let normalized = base;
  while (normalized.endsWith('/ws') || normalized.endsWith('/ws/')) {
    normalized = normalized.replace(/\/ws\/?$/, '');
  }
  // Remove any trailing slash
  normalized = normalized.replace(/\/$/, '');
  return normalized;
};
const WS_BASE_NORMALIZED = normalizeWsBase(WS_BASE);

// Cache configuration
const CACHE_CONFIG = {
    marketData: { ttl: 60000, maxSize: 100, staleWhileRevalidate: true }, // 1 minute
    signals: { ttl: 300000, maxSize: 50, staleWhileRevalidate: true }, // 5 minutes
    health: { ttl: 30000, maxSize: 10, staleWhileRevalidate: false }, // 30 seconds
};

// Subscription types
type SubscriptionType = 'market_data' | 'signal_update' | 'health' | 'training_metrics' | 'liquidation_risk';

// Subscription callback type
type SubscriptionCallback = (data: any) => void;

// Subscription interface
interface Subscription {
    id: string;
    type: SubscriptionType;
    symbols: string[];
    callback: SubscriptionCallback;
}

class DataManager {
    // WebSocket connection
    private ws: WebSocket | null = null;
    private connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isManualDisconnect = false; // Track if disconnect was manual
    private subscriptions: Map<string, Subscription> = new Map();
    private messageQueue: any[] = [];
    private isProcessingQueue = false;

    // Caches
    private caches: {
        marketData: AdvancedCache<any>;
        signals: AdvancedCache<any>;
        health: AdvancedCache<any>;
    };

    constructor() {
        // Initialize caches
        this.caches = {
            marketData: new AdvancedCache(CACHE_CONFIG.marketData),
            signals: new AdvancedCache(CACHE_CONFIG.signals),
            health: new AdvancedCache(CACHE_CONFIG.health),
        };
    }

    /**
     * Connect to WebSocket server
     */
    async connectWebSocket(): Promise<void> {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        // Clear any pending reconnect timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // Reset manual disconnect flag when attempting new connection
        this.isManualDisconnect = false;

        this.connectionStatus = ConnectionStatus.CONNECTING;

        let connectionTimeout: NodeJS.Timeout | null = null;

        try {
            await new Promise<void>((resolve) => {
                let connectionResolved = false;

                try {
                    // In dev mode, use relative path to leverage Vite proxy
                    // In production, use absolute WS_BASE URL
                    const wsUrl = import.meta.env.DEV
                        ? `${location.origin.replace(/^http/, 'ws')}${WS_PATH}`
                        : `${WS_BASE_NORMALIZED}${WS_PATH}`;

                    if (import.meta.env.DEV) {
                        logger.info(`Attempting WebSocket connection to: ${wsUrl} (via Vite proxy)`);
                    }

                    // Suppress browser console error by wrapping in try-catch
                    // The browser will still log "Invalid frame header" but we handle it gracefully
                    this.ws = new WebSocket(wsUrl);

                    this.ws.onopen = () => {
                        if (import.meta.env.DEV) {
                            logger.info('✅ WebSocket connected successfully');
                        }
                        if (connectionTimeout) {
                            clearTimeout(connectionTimeout);
                            connectionTimeout = null;
                        }
                        this.connectionStatus = ConnectionStatus.CONNECTED;
                        this.reconnectAttempts = 0;
                        this.processMessageQueue();
                        if (!connectionResolved) {
                            connectionResolved = true;
                            resolve();
                        }
                    };

                    this.ws.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            this.handleMessage(data);
                        } catch (error) {
                            if (import.meta.env.DEV) {
                                logger.error('Error parsing WebSocket message:', {}, error);
                            }
                        }
                    };

                    this.ws.onerror = (error) => {
                        if (connectionTimeout) {
                            clearTimeout(connectionTimeout);
                            connectionTimeout = null;
                        }
                        // Only log errors in development mode
                        if (import.meta.env.DEV) {
                            logger.warn('WebSocket connection error (server may not be running)');
                        }
                        this.connectionStatus = ConnectionStatus.ERROR;
                        // Don't reject here - let onclose handle it
                    };

                    this.ws.onclose = (event) => {
                        if (connectionTimeout) {
                            clearTimeout(connectionTimeout);
                            connectionTimeout = null;
                        }

                        this.connectionStatus = ConnectionStatus.DISCONNECTED;

                        // Only auto-reconnect if this wasn't a manual disconnect
                        if (!this.isManualDisconnect && !connectionResolved) {
                            // Failed initial connection - resolve silently to prevent uncaught promise errors
                            // The app can continue without WebSocket
                            if (import.meta.env.DEV) {
                                logger.warn(`WebSocket connection closed before establishment. Server may not be running on ${wsUrl}`);
                            }
                            connectionResolved = true;
                            resolve(); // Resolve silently - app can work without WebSocket
                        } else if (!this.isManualDisconnect && this.reconnectAttempts > 0) {
                            // Auto-reconnect for established connections that dropped
                            this.handleDisconnect();
                        }
                        // Reset manual disconnect flag after handling
                        this.isManualDisconnect = false;
                    };

                    // Timeout for connection - increased to 10 seconds
                    connectionTimeout = setTimeout(() => {
                        connectionTimeout = null;
                        if (this.ws?.readyState !== WebSocket.OPEN) {
                            if (this.ws) {
                                this.ws.close();
                                this.ws = null;
                            }
                            if (!connectionResolved) {
                                connectionResolved = true;
                                // Resolve silently instead of rejecting to prevent uncaught promise errors
                                if (import.meta.env.DEV) {
                                    logger.warn(`WebSocket connection timeout after 10s. Server may not be running on ${wsUrl}`);
                                }
                                resolve();
                            }
                        }
                    }, 10000); // Increased timeout to 10 seconds
                } catch (error) {
                    if (connectionTimeout) {
                        clearTimeout(connectionTimeout);
                    }
                    // Resolve silently instead of rejecting to prevent uncaught promise errors
                    if (import.meta.env.DEV) {
                        logger.warn('WebSocket connection error:', error);
                    }
                    resolve();
                }
            });
        } catch (error) {
            // Gracefully handle connection failures - don't throw uncaught promises
            // Suppress all errors - browser will log its own messages
            this.connectionStatus = ConnectionStatus.DISCONNECTED;
            this.ws = null;
            // Don't throw - allow app to continue without WebSocket
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnectWebSocket(): void {
        // Mark as manual disconnect to prevent auto-reconnect
        this.isManualDisconnect = true;

        // Clear any pending reconnect timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            try {
                // Only close if connection is open or connecting
                if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                    this.ws.close();
                }
            } catch (error) {
                // Ignore errors when closing
            }
            this.ws = null;
            this.connectionStatus = ConnectionStatus.DISCONNECTED;
            this.reconnectAttempts = 0; // Reset reconnect attempts on manual disconnect
        }
    }

    /**
     * Handle WebSocket disconnection
     */
    private handleDisconnect(): void {
        // Clear any existing reconnect timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            logger.info(`WebSocket disconnected. Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts});...`);

            this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = null;
                this.connectWebSocket().catch(error => {
                    logger.error('Reconnection failed:', {}, error);
                });
            }, delay);
        } else {
            logger.error(`WebSocket disconnected. Maximum reconnect attempts (${this.maxReconnectAttempts}); reached.`);
        }
    }

    /**
     * Process message queue
     */
    private processMessageQueue(): void {
        if (this.isProcessingQueue || this.messageQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while ((this.messageQueue?.length || 0) > 0) {
            const message = this.messageQueue.shift();
            this.sendMessage(message);
        }

        this.isProcessingQueue = false;
    }

    /**
     * Send message to WebSocket server
     */
    private sendMessage(message: any): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.messageQueue.push(message);
            this.connectWebSocket().catch(error => {
                logger.error('Failed to connect to WebSocket:', {}, error);
            });
            return;
        }

        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            logger.error('Error sending WebSocket message:', {}, error);
            this.messageQueue.push(message);
        }
    }

    /**
     * Handle incoming WebSocket message
     */
    private handleMessage(data: any): void {
        if (!data || !data.type) {
            return;
        }

        // Update cache based on message type
        switch (data.type) {
            case 'market_data':
                if (data.symbol) {
                    this.caches.marketData.set(data.symbol, data);
                }
                break;
            case 'signal_update':
                if (data.symbol) {
                    this.caches.signals.set(data.symbol, data);
                }
                break;
            case 'health':
                this.caches.health.set('health', data);
                break;
        }

        // Notify subscribers
        this.notifySubscribers(data);
    }

    /**
     * Notify subscribers of new data
     */
    private notifySubscribers(data: any): void {
        this.subscriptions.forEach(subscription => {
            if (subscription.type === data.type) {
                // Check if subscription applies to this message
                const isRelevant =
                    subscription.type === 'health' ||
                    subscription.symbols.length === 0 ||
                    (data.symbol && subscription.symbols.includes(data.symbol));

                if (isRelevant) {
                    try {
                        subscription.callback(data);
                    } catch (error) {
                        logger.error('Error in subscription callback:', {}, error);
                    }
                }
            }
        });
    }

    /**
     * Subscribe to data updates
     */
    subscribe(
        type: SubscriptionType,
        symbols: string[] = [],
        callback: SubscriptionCallback
    ): () => void {
        const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.subscriptions.set(id, {
            id,
            type,
            symbols,
            callback,
        });

        // Send subscription message to server
        this.sendMessage({
            action: 'subscribe',
            type,
            symbols,
        });

        // Check cache for immediate data
        if ((symbols?.length || 0) > 0) {
            let cache: AdvancedCache<any>;

            switch (type) {
                case 'market_data':
                    cache = this.caches.marketData;
                    break;
                case 'signal_update':
                    cache = this.caches.signals;
                    break;
                case 'health':
                    cache = this.caches.health;
                    break;
            }

            symbols.forEach(symbol => {
                const cachedData = cache.get(symbol);
                if (cachedData) {
                    // Use requestAnimationFrame or Promise.resolve instead of setTimeout to prevent leaks
                    Promise.resolve().then(() => {
                        if (this.subscriptions.has(id)) {
                            callback(cachedData);
                        }
                    });
                }
            });
        } else if (type === 'health') {
            const cachedHealth = this.caches.health.get('health');
            if (cachedHealth) {
                Promise.resolve().then(() => {
                    if (this.subscriptions.has(id)) {
                        callback(cachedHealth);
                    }
                });
            }
        }

        // Return unsubscribe function
        return () => {
            this.subscriptions.delete(id);

            // Send unsubscribe message to server
            this.sendMessage({
                action: 'unsubscribe',
                id,
            });
        };
    }

    /**
     * Fetch data with retry and caching
     */
    async fetchData<T>(url: string, options: RequestInit = {}, timeout: number = 10000): Promise<T> {
        // Prepend base URL if relative path provided
        // Remove duplicate /api/ if URL already starts with /api/
        let cleanUrl = url.startsWith('http') ? url : url;

        if (!cleanUrl.startsWith('http')) {
            // Strip leading /api/ if present to avoid double /api/api/
            cleanUrl = cleanUrl.replace(/^\/api\//, '/');
            // Ensure URL starts with /
            if (!cleanUrl.startsWith('/')) {
                cleanUrl = '/' + cleanUrl;
            }
            // Combine with base URL
            cleanUrl = `${API_BASE_URL}${cleanUrl}`;
        }

        const fullUrl = cleanUrl;
        const cacheKey = `${fullUrl}_${JSON.stringify(options)}`;

        if (import.meta.env.DEV) {
            logger.info('Fetching:', { data: fullUrl });
        }

        return retry(
            async () => {
                // Use provided signal or create new AbortController for timeout
                const controller = options.signal ? undefined : new AbortController();
                const timeoutId = controller ? setTimeout(() => controller.abort(), timeout) : undefined;

                try {
                    const response = await fetch(fullUrl, {
                        ...options,
                        signal: options.signal || controller?.signal,
                        headers: {
                            'Content-Type': 'application/json',
                            ...options.headers,
                        }
                    });

                    if (timeoutId) clearTimeout(timeoutId);

                    if (!response.ok) {
                        // Create error with status code so retry logic can handle it
                        const error: any = new Error(`HTTP error ${response.status}: ${response.statusText}`);
                        error.status = response.status;
                        error.statusCode = response.status;
                        error.url = fullUrl;

                        // For 404 errors, log a warning but don't throw yet (let retry decide)
                        if (response.status === 404) {
                            if (import.meta.env.DEV) {
                                logger.warn(`API endpoint not found: ${fullUrl}`);
                            }
                        }

                        throw error;
                    }

                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        console.error(`Expected JSON but got ${contentType || 'unknown content type'}`);
                    }

                    return await response.json();
                } catch (error: any) {
                    if (timeoutId) clearTimeout(timeoutId);
                    if (error.name === 'AbortError') {
                        logger.warn(`Request timeout after ${timeout}ms`, { url });
                    }
                    throw error;
                }
            },
            {
                retries: 3,
                delay: 1000,
                backoff: 2,
                // Retry logic will automatically skip 404s due to shouldRetry in retry.ts
            }
        );
    }

    /**
     * Get connection status
     */
    getConnectionStatus(): ConnectionStatus {
        return this.connectionStatus;
    }

    /**
     * Clear all caches
     */
    clearCaches(): void {
        this.caches.marketData.clear();
        this.caches.signals.clear();
        this.caches.health.clear();
    }

    /**
     * Get fallback prediction data
     */
    private getFallbackPrediction(symbol: string, type: string) {
        return {
            success: false,
            prediction: {
                direction: 'NEUTRAL',
                confidence: 0.5,
                bullishProbability: 0.33,
                bearishProbability: 0.33,
                neutralProbability: 0.34,
                risk: 0.3,
                targetPrice: undefined,
                stopLoss: undefined
            },
            confidence: 0.5,
            probabilities: {
                bull: 0.33,
                bear: 0.33,
                neutral: 0.34
            },
            timeframe: '1h',
            timestamp: Date.now(),
            riskScore: 0.3,
            isFallback: true
        };
    }

    /**
     * Analyze harmonic patterns
     */
    async analyzeHarmonic(symbol: string): Promise<any> {
        try {
            const response = await this.fetchData(`/analysis/harmonic`, {
                method: 'POST',
                body: JSON.stringify({ symbol })
            });
            return response;
        } catch (error) {
            logger.error('Harmonic analysis failed:', {}, error);
            return {
                success: false,
                patterns: [],
                error: 'Failed to analyze harmonic patterns'
            };
        }
    }

    /**
     * Analyze Elliott Wave
     */
    async analyzeElliott(symbol: string): Promise<any> {
        try {
            const response = await this.fetchData(`/analysis/elliott`, {
                method: 'POST',
                body: JSON.stringify({ symbol })
            });
            return response;
        } catch (error) {
            logger.error('Elliott Wave analysis failed:', {}, error);
            return {
                success: false,
                wave: null,
                error: 'Failed to analyze Elliott Wave'
            };
        }
    }

    /**
     * Analyze Smart Money Concepts
     */
    async analyzeSMC(symbol: string): Promise<any> {
        try {
            const response = await this.fetchData(`/analysis/smc`, {
                method: 'POST',
                body: JSON.stringify({ symbol })
            });
            return response;
        } catch (error) {
            logger.error('SMC analysis failed:', {}, error);
            return {
                success: false,
                data: null,
                error: 'Failed to analyze Smart Money Concepts'
            };
        }
    }

    /**
     * Predict market direction using AI
     */
    async predict(symbol: string, type: 'directional' | 'price' = 'directional'): Promise<any> {
        try {
            const response = await this.fetchData<{
                success: boolean;
                prediction?: any;
                data?: any;
                confidence?: number;
                probabilities?: { bull?: number; bear?: number; neutral?: number };
                timeframe?: string;
                timestamp?: number;
                riskScore?: number;
                targetPrice?: number;
                stopLoss?: number;
            }>(`/ai/predict?symbol=${symbol}&type=${type}`);

            if (response && response.success) {
                return response.data || response;
            }

            // Fallback: return mock data if API fails
            if (import.meta.env.MODE === 'development') {
                return {
                    success: true,
                    prediction: {
                        direction: Math.random() > 0.5 ? 'UP' : 'DOWN',
                        confidence: 0.5 + Math.random() * 0.3,
                        bullishProbability: Math.random() * 0.4 + 0.3,
                        bearishProbability: Math.random() * 0.4 + 0.3,
                        neutralProbability: 1 - (Math.random() * 0.8 + 0.6),
                        risk: Math.random() * 0.4 + 0.2,
                        targetPrice: undefined,
                        stopLoss: undefined
                    },
                    confidence: 0.5 + Math.random() * 0.3,
                    probabilities: {
                        bull: Math.random() * 0.4 + 0.3,
                        bear: Math.random() * 0.4 + 0.3,
                        neutral: 1 - (Math.random() * 0.8 + 0.6)
                    },
                    timeframe: '1h',
                    timestamp: Date.now(),
                    riskScore: Math.random() * 0.4 + 0.2
                };
            }

            console.error('Failed to get prediction from API');
        } catch (error: any) {
            // Check if it's a 404 error
            if (error?.status === 404 || error?.statusCode === 404) {
                if (import.meta.env.DEV) {
                    logger.warn('AI prediction endpoint not available (404);, using fallback');
                }
                return this.getFallbackPrediction(symbol, type);
            }

            if (import.meta.env.DEV) {
                logger.warn('AI prediction failed, using fallback:', error);
            }

            // Return fallback data for any other error
            return this.getFallbackPrediction(symbol, type);
        }
    }

    /**
     * Analyze sentiment for a symbol
     */
    async analyzeSentiment(symbol: string): Promise<any> {
        try {
            const response = await this.fetchData(`/analysis/sentiment?symbol=${symbol}`);
            return response;
        } catch (error) {
            logger.error('Sentiment analysis failed:', {}, error);
            return {
                success: false,
                sentiment: 0,
                overallScore: 0,
                error: 'Failed to analyze sentiment'
            };
        }
    }

    /**
     * Track whale activity for a symbol
     */
    async trackWhaleActivity(symbol: string): Promise<any> {
        try {
            const response = await this.fetchData(`/analysis/whale?symbol=${symbol}`);
            return response;
        } catch (error) {
            logger.error('Whale activity tracking failed:', {}, error);
            return {
                success: false,
                whaleActivity: null,
                transactions: [],
                error: 'Failed to track whale activity'
            };
        }
    }
}

// Export singleton instance

const logger = Logger.getInstance();

export const dataManager = new DataManager();

export default dataManager;