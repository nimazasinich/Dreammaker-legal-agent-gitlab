/**
 * Badge UI Component
 * Simple stub implementation for DiagnosticsView
 */

import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'bg-blue-600 text-white',
      secondary: 'bg-slate-700 text-slate-300',
      destructive: 'bg-red-600 text-white',
      outline: 'border border-slate-600 text-slate-300',
      success: 'bg-green-600 text-white',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
