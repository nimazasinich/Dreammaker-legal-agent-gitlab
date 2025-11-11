import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

export type ToastType = 'info' | 'warning' | 'error' | 'success';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

let toastIdCounter = 0;
const toastListeners = new Set<(toasts: Toast[]) => void>();
let currentToasts: Toast[] = [];

export function showToast(type: ToastType, title: string, message: string) {
  const id = `toast-${Date.now()}-${toastIdCounter++}`;
  const newToast: Toast = { id, type, title, message };
  currentToasts = [...currentToasts, newToast];
  toastListeners.forEach(listener => listener(currentToasts));

  // Auto-dismiss after 8 seconds
  setTimeout(() => {
    dismissToast(id);
  }, 8000);
}

export function dismissToast(id: string) {
  currentToasts = currentToasts.filter(t => t.id !== id);
  toastListeners.forEach(listener => listener(currentToasts));
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>(currentToasts);

  useEffect(() => {
    toastListeners.add(setToasts);
    return () => {
      toastListeners.delete(setToasts);
    };
  }, []);

  return toasts;
}

const TYPE_STYLES: Record<ToastType, string> = {
  info: 'bg-blue-900 border-blue-700 text-blue-100',
  warning: 'bg-orange-900 border-orange-700 text-orange-100',
  error: 'bg-red-900 border-red-700 text-red-100',
  success: 'bg-green-900 border-green-700 text-green-100',
};

export function ToastContainer() {
  const toasts = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm pointer-events-none">
      {(toasts || []).map(toast => (
        <div
          key={toast.id}
          className={`${TYPE_STYLES[toast.type]} border rounded-lg shadow-lg p-4 pointer-events-auto`}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm mb-1">{toast.title}</div>
              <div className="text-xs opacity-90">{toast.message}</div>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
