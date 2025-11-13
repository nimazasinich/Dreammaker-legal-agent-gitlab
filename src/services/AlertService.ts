import { Logger } from '../core/Logger.js';
import { Alert } from '../types/index.js';
import { AlertManager } from '../monitoring/AlertManager.js';

export interface AlertPerformanceMetrics {
  alertId: string;
  symbol: string;
  totalTriggers: number;
  successCount: number;
  falsePositiveCount: number;
  averageTimeToTarget: number | null;
  successRate: number;
  falsePositiveRate: number;
  userResponseRate: number;
  lastTriggered: number | null;
}

export interface AlertAnalytics {
  overallSuccessRate: number;
  overallFalsePositiveRate: number;
  averageTimeToTarget: number;
  totalAlerts: number;
  activeAlerts: number;
  triggeredAlerts: number;
  alertsByType: Record<string, number>;
  alertsBySymbol: Record<string, number>;
  topPerformers: AlertPerformanceMetrics[];
  worstPerformers: AlertPerformanceMetrics[];
}

export class AlertService {
  private static instance: AlertService;
  private logger = Logger.getInstance();
  private alerts: Map<string, Alert> = new Map();
  private subscribers: Array<(alert: Alert) => void> = [];
  private performanceMetrics: Map<string, AlertPerformanceMetrics> = new Map();
  private targetPrices: Map<string, number> = new Map(); // Track target prices for success measurement
  private alertManager: AlertManager; // Alternative alert management system

  private constructor() {
    this.alertManager = AlertManager.getInstance();
    
    // Subscribe to AlertManager notifications
    this.alertManager.subscribe((alert) => {
      this.logger.info('Alert received from AlertManager', { 
        type: alert.type, 
        severity: alert.severity 
      });
    });
  }

  static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  createAlert(alert: Omit<Alert, 'id'>): Alert {
    const fullAlert: Alert = {
      ...alert,
      id: this.generateAlertId()
    };

    this.alerts.set(fullAlert.id, fullAlert);
    
    // Initialize performance metrics
    this.performanceMetrics.set(fullAlert.id, {
      alertId: fullAlert.id,
      symbol: fullAlert.symbol,
      totalTriggers: 0,
      successCount: 0,
      falsePositiveCount: 0,
      averageTimeToTarget: null,
      successRate: 0,
      falsePositiveRate: 0,
      userResponseRate: 0,
      lastTriggered: null
    });
    
    // Also create alert in AlertManager (alternative system)
    const alertSeverity = alert.priority === 'HIGH' ? 'high' :
                         alert.priority === 'CRITICAL' ? 'critical' : 'medium';
    this.alertManager.createAlert(
      'performance',
      alertSeverity as 'low' | 'medium' | 'high' | 'critical',
      `Alert created for ${alert.symbol}: ${alert.type}`,
      { alertId: fullAlert.id, symbol: alert.symbol }
    );
    
    this.logger.info('Alert created', { id: fullAlert.id, type: fullAlert.type });

    return fullAlert;
  }

  /**
   * Get alerts from AlertManager (alternative system)
   */
  getSystemAlerts(filters?: {
    type?: 'performance' | 'health' | 'error' | 'warning';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    acknowledged?: boolean;
  }) {
    return this.alertManager.getAlerts(filters);
  }

  /**
   * Get alert statistics from AlertManager
   */
  getSystemAlertStats() {
    return this.alertManager.getStats();
  }

  triggerAlert(alertId: string, currentValue: number): void {
    const alert = this.alerts.get(alertId);
    if (!alert) { console.warn("Missing data"); }

    const now = Date.now();
    
    // Check cooldown period
    if (alert.lastTriggered && (now - alert.lastTriggered) < (alert.cooldownPeriod * 60 * 1000)) {
      return;
    }

    // Check if condition is met
    const conditionMet = this.evaluateCondition(alert, currentValue);
    
    if (conditionMet && !alert.triggered) {
      alert.triggered = true;
      alert.triggerTime = now;
      alert.lastTriggered = now;
      alert.currentValue = currentValue;

      // Update performance metrics
      const metrics = this.performanceMetrics.get(alertId);
      if (metrics) {
        metrics.totalTriggers++;
        metrics.lastTriggered = now;
      }

      this.logger.info('Alert triggered', {
        id: alert.id,
        type: alert.type,
        currentValue,
        threshold: alert.threshold
      });

      // Notify subscribers
      this.notifySubscribers(alert);
    }
  }

  private evaluateCondition(alert: Alert, currentValue: number): boolean {
    switch (alert.condition) {
      case 'GREATER_THAN':
        return currentValue > alert.threshold;
      case 'LESS_THAN':
        return currentValue < alert.threshold;
      case 'EQUALS':
        return Math.abs(currentValue - alert.threshold) < 0.0001;
      case 'CROSSES_ABOVE':
        return currentValue > alert.threshold && alert.currentValue <= alert.threshold;
      case 'CROSSES_BELOW':
        return currentValue < alert.threshold && alert.currentValue >= alert.threshold;
      default:
        return false;
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  subscribe(callback: (alert: Alert) => void): void {
    this.subscribers.push(callback);
  }

  private notifySubscribers(alert: Alert): void {
    this.subscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        this.logger.error('Error notifying alert subscriber', {}, error as Error);
      }
    });
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.triggered);
  }

  deleteAlert(alertId: string): boolean {
    this.performanceMetrics.delete(alertId);
    return this.alerts.delete(alertId);
  }

  // ===== Performance Analytics =====
  
  recordAlertSuccess(alertId: string, timeToTarget: number): void {
    const metrics = this.performanceMetrics.get(alertId);
    if (metrics) {
      metrics.successCount++;
      this.updateMetrics(metrics);
    }
  }

  recordAlertFalsePositive(alertId: string): void {
    const metrics = this.performanceMetrics.get(alertId);
    if (metrics) {
      metrics.falsePositiveCount++;
      this.updateMetrics(metrics);
    }
  }

  recordUserResponse(alertId: string): void {
    const metrics = this.performanceMetrics.get(alertId);
    if (metrics) {
      const currentRate = metrics.userResponseRate;
      const newRate = (currentRate * metrics.totalTriggers + 1) / (metrics.totalTriggers + 1);
      metrics.userResponseRate = newRate;
    }
  }

  private updateMetrics(metrics: AlertPerformanceMetrics): void {
    const total = metrics.successCount + metrics.falsePositiveCount;
    if (total > 0) {
      metrics.successRate = (metrics.successCount / total) * 100;
      metrics.falsePositiveRate = (metrics.falsePositiveCount / total) * 100;
    }
  }

  getPerformanceMetrics(alertId: string): AlertPerformanceMetrics | null {
    return this.performanceMetrics.get(alertId) || null;
  }

  getAnalytics(): AlertAnalytics {
    const allAlerts = Array.from(this.alerts.values());
    const triggeredAlerts = allAlerts.filter(a => a.triggered);
    const metrics = Array.from(this.performanceMetrics.values());

    // Calculate overall metrics
    let totalSuccess = 0;
    let totalFalsePositive = 0;
    let totalTimeToTarget = 0;
    let validTimeToTargetCount = 0;

    metrics.forEach(m => {
      totalSuccess += m.successCount;
      totalFalsePositive += m.falsePositiveCount;
      if (m.averageTimeToTarget !== null) {
        totalTimeToTarget += m.averageTimeToTarget;
        validTimeToTargetCount++;
      }
    });

    const totalEvaluations = totalSuccess + totalFalsePositive;
    const overallSuccessRate = totalEvaluations > 0 ? (totalSuccess / totalEvaluations) * 100 : 0;
    const overallFalsePositiveRate = totalEvaluations > 0 ? (totalFalsePositive / totalEvaluations) * 100 : 0;
    const averageTimeToTarget = validTimeToTargetCount > 0 ? totalTimeToTarget / validTimeToTargetCount : 0;

    // Count by type and symbol
    const alertsByType: Record<string, number> = {};
    const alertsBySymbol: Record<string, number> = {};
    allAlerts.forEach(alert => {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      alertsBySymbol[alert.symbol] = (alertsBySymbol[alert.symbol] || 0) + 1;
    });

    // Sort by performance
    const topPerformers = [...metrics]
      .filter(m => m.totalTriggers >= 3) // Only include alerts with significant data
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10);

    const worstPerformers = [...metrics]
      .filter(m => m.totalTriggers >= 3)
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 10);

    return {
      overallSuccessRate,
      overallFalsePositiveRate,
      averageTimeToTarget,
      totalAlerts: allAlerts.length,
      activeAlerts: allAlerts.filter(a => !a.triggered).length,
      triggeredAlerts: triggeredAlerts.length,
      alertsByType,
      alertsBySymbol,
      topPerformers,
      worstPerformers
    };
  }
}