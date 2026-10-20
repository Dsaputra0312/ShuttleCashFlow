import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', padding = true, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-surface rounded-xl shadow-card border border-line',
        padding ? 'p-4' : '',
        onClick ? 'cursor-pointer active:opacity-90' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
  return (
    <div className={['flex items-start justify-between gap-2', className].join(' ')}>
      <div>
        <h3 className="text-heading font-heading text-ink-900">{title}</h3>
        {subtitle && (
          <p className="text-caption text-ink-600 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
