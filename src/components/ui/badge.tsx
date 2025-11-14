import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'secondary' | 'destructive';
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  className = '',
  children
}) => {
  const variantStyles = {
    default: 'bg-slate-600 text-slate-100',
    success: 'bg-green-600 text-white',
    warning: 'bg-yellow-600 text-white',
    error: 'bg-red-600 text-white',
    destructive: 'bg-red-700 text-white',
    secondary: 'bg-slate-700 text-slate-200'
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
