/**
 * Skeleton - Loading placeholder components
 *
 * Features:
 * - Animated shimmer effect
 * - Multiple variants (text, card, chart)
 * - Customizable width and height
 * - No layout shift
 *
 * @example
 * ```tsx
 * <Skeleton variant="text" width="200px" height="20px" />
 * <ChartSkeleton />
 * <DashboardSkeleton />
 * ```
 */

import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'chart' | 'circle';
  width?: string;
  height?: string;
  className?: string;
}

/**
 * Base Skeleton component
 */
export function Skeleton({
  variant = 'text',
  width = '100%',
  height = '20px',
  className = ''
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded',
    card: 'rounded-lg',
    chart: 'rounded-lg',
    circle: 'rounded-full'
  };

  return (
    <div
      className={`
        animate-pulse
        bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700
        ${variantClasses[variant]}
        ${className}
      `}
      style={{
        width,
        height,
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite linear'
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

/**
 * Chart Skeleton - For ChartingView
 */
export function ChartSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="200px" height="32px" />
        <Skeleton variant="text" width="120px" height="24px" />
      </div>

      {/* Main chart area */}
      <Skeleton variant="chart" width="100%" height="400px" />

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton variant="text" width="100%" height="16px" />
            <Skeleton variant="text" width="80%" height="24px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Dashboard Skeleton - For Dashboard view
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Title */}
      <Skeleton variant="text" width="300px" height="36px" />

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton variant="card" width="100%" height="200px" />
            <Skeleton variant="text" width="100%" height="20px" />
            <Skeleton variant="text" width="60%" height="16px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Table Skeleton - For data tables
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width="100%" height="20px" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" width="90%" height="16px" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Card Skeleton - For card components
 */
export function CardSkeleton() {
  return (
    <div className="p-6 space-y-4 border border-slate-700 rounded-lg bg-slate-800/50">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="150px" height="24px" />
        <Skeleton variant="circle" width="40px" height="40px" />
      </div>
      <Skeleton variant="text" width="100%" height="60px" />
      <div className="flex justify-between">
        <Skeleton variant="text" width="100px" height="16px" />
        <Skeleton variant="text" width="80px" height="16px" />
      </div>
    </div>
  );
}

export default Skeleton;
