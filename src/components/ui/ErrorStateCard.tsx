import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ErrorStateCardProps {
  /**
   * Optional title for the error (default: "Unable to load data")
   */
  title?: string;

  /**
   * Error message to display
   */
  message: string;

  /**
   * Optional retry callback - if provided, shows a retry button
   */
  onRetry?: () => void;

  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * ErrorStateCard - Reusable error UI component
 *
 * Displays error states with a consistent design that matches the project's
 * glassmorphism style. Supports RTL layouts and optional retry functionality.
 *
 * @example
 * ```tsx
 * <ErrorStateCard
 *   title="Data source error"
 *   message="Failed to connect to HuggingFace Data Engine"
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export function ErrorStateCard({
  title = 'Unable to load data',
  message,
  onRetry,
  className = ''
}: ErrorStateCardProps) {
  return (
    <div
      className={`rounded-xl p-6 backdrop-blur-sm ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
      }}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-4">
        {/* Error Icon */}
        <div
          className="flex-shrink-0 p-2 rounded-lg"
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)'
          }}
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-red-200 mb-1">
            {title}
          </h3>
          <p className="text-sm text-red-300/80 break-words">
            {message}
          </p>

          {/* Retry Button */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.3) 100%)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                color: 'rgba(254, 226, 226, 1)',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
              }}
              aria-label="Retry loading data"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorStateCard;
