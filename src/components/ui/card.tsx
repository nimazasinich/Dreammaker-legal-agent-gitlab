import React from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface CardDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className = '', children }) => (
  <div className={`rounded-lg border border-slate-700 bg-slate-800 ${className}`}>
    {children}
  </div>
);

export const CardHeader: React.FC<CardHeaderProps> = ({ className = '', children }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>
    {children}
  </div>
);

export const CardTitle: React.FC<CardTitleProps> = ({ className = '', children }) => (
  <h3 className={`text-lg font-semibold leading-none tracking-tight text-white ${className}`}>
    {children}
  </h3>
);

export const CardDescription: React.FC<CardDescriptionProps> = ({ className = '', children }) => (
  <p className={`text-sm text-slate-400 ${className}`}>
    {children}
  </p>
);

export const CardContent: React.FC<CardContentProps> = ({ className = '', children }) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
);
