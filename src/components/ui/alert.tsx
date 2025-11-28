import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';

export type AlertVariant = 'default' | 'error' | 'warning' | 'success' | 'info' | 'secondary' | 'destructive' | 'outline';

export interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const variantStyles: Record<AlertVariant, string> = {
  default: 'bg-blue-500/10 border-blue-500/30 text-blue-200',
  error: 'bg-red-500/10 border-red-500/30 text-red-200',
  destructive: 'bg-red-500/10 border-red-500/30 text-red-200',
  warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200',
  success: 'bg-green-500/10 border-green-500/30 text-green-200',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-200',
  secondary: 'bg-gray-500/10 border-gray-500/30 text-gray-200',
  outline: 'bg-transparent border-white/30 text-white',
};

const variantIcons: Record<AlertVariant, React.ComponentType<{ className?: string }>> = {
  default: Info,
  error: XCircle,
  destructive: XCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
  secondary: AlertCircle,
  outline: Info,
};

export function Alert({ variant = 'default', children, className = '', icon }: AlertProps) {
  const Icon = variantIcons[variant];
  
  return (
    <div
      className={`flex items-start space-x-3 p-4 rounded-lg border ${variantStyles[variant]} ${className}`}
      role="alert"
    >
      {icon || <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />}
      <div className="flex-1">{children}</div>
    </div>
  );
}

export interface AlertTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertTitle({ children, className = '' }: AlertTitleProps) {
  return <div className={`font-semibold mb-1 ${className}`}>{children}</div>;
}

export interface AlertDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDescription({ children, className = '' }: AlertDescriptionProps) {
  return <div className={`text-sm opacity-90 ${className}`}>{children}</div>;
}
