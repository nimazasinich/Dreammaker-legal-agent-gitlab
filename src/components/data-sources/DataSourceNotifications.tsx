/**
 * DataSourceNotifications Component
 * 
 * Display notifications for data source events (failures, fallbacks, warnings)
 * Real-time updates via EventEmitter/WebSocket
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Bell,
  BellOff,
  Trash2,
  X
} from 'lucide-react';

export interface DataSourceNotification {
  id?: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  source: string;
  timestamp: number;
  details?: any;
  read?: boolean;
}

interface DataSourceNotificationsProps {
  maxNotifications?: number;
  showTimestamp?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const DataSourceNotifications: React.FC<DataSourceNotificationsProps> = ({
  maxNotifications = 10,
  showTimestamp = true,
  autoHide = false,
  autoHideDelay = 5000
}) => {
  const [notifications, setNotifications] = useState<DataSourceNotification[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // In a real implementation, this would connect to WebSocket or EventSource
    // For now, we'll poll the notifications endpoint
    if (enabled) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 5000);
      return () => clearInterval(interval);
    }
  }, [enabled]);

  useEffect(() => {
    // Update unread count
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  useEffect(() => {
    // Auto-hide notifications after delay
    if (autoHide && notifications.length > 0) {
      const timeout = setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, autoHideDelay);
      return () => clearTimeout(timeout);
    }
  }, [notifications, autoHide, autoHideDelay]);

  const fetchNotifications = async () => {
    try {
      // This would fetch from an actual API endpoint
      // For now, we'll just maintain the current state
      // const response = await fetch('/api/data-sources/notifications');
      // const data = await response.json();
      // if (data.success) {
      //   setNotifications(data.notifications);
      // }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const addNotification = useCallback((notification: DataSourceNotification) => {
    if (!enabled) return;

    const newNotification = {
      ...notification,
      id: notification.id || `notif-${Date.now()}-${Math.random()}`,
      read: false
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, maxNotifications));
  }, [enabled, maxNotifications]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const toggleEnabled = () => {
    setEnabled(prev => !prev);
  };

  const getIcon = (type: DataSourceNotification['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getVariant = (type: DataSourceNotification['type']): 'default' | 'destructive' => {
    return type === 'error' ? 'destructive' : 'default';
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleString();
  };

  // Expose addNotification globally for use by data source manager
  useEffect(() => {
    (window as any).__addDataSourceNotification = addNotification;
    return () => {
      delete (window as any).__addDataSourceNotification;
    };
  }, [addNotification]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Data Source Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={notifications.length === 0}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleEnabled}
            >
              {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!enabled && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Notifications are disabled. Click the bell icon to enable.
            </AlertDescription>
          </Alert>
        )}

        {enabled && notifications.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No notifications</p>
            <p className="text-sm">You'll see data source events here</p>
          </div>
        )}

        <div className="space-y-3">
          {notifications.map((notification) => (
            <Alert
              key={notification.id}
              variant={getVariant(notification.type)}
              className={`relative ${notification.read ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                {getIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <AlertTitle className="text-sm font-semibold">
                      {notification.message}
                    </AlertTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeNotification(notification.id!)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <AlertDescription className="text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {notification.source}
                      </Badge>
                      {showTimestamp && (
                        <span className="text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      )}
                    </div>
                    {notification.details && (
                      <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                        {JSON.stringify(notification.details, null, 2)}
                      </pre>
                    )}
                  </AlertDescription>
                </div>
              </div>
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute bottom-2 right-2 h-6 text-xs"
                  onClick={() => markAsRead(notification.id!)}
                >
                  Mark as read
                </Button>
              )}
            </Alert>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DataSourceNotifications;

// Hook for adding notifications from anywhere in the app
export const useDataSourceNotifications = () => {
  const addNotification = useCallback((notification: Omit<DataSourceNotification, 'id'>) => {
    if (typeof window !== 'undefined' && (window as any).__addDataSourceNotification) {
      (window as any).__addDataSourceNotification(notification);
    }
  }, []);

  return { addNotification };
};
