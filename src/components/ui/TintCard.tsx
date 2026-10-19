import React from 'react';

type TintVariant = 'orange' | 'lavender' | 'mint' | 'peach';

interface TintCardProps {
  variant: TintVariant;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantMap: Record<TintVariant, string> = {
  orange: 'bg-tint-orange',
  lavender: 'bg-tint-lavender',
  mint: 'bg-tint-mint',
  peach: 'bg-tint-peach',
};

/** Pastel-background card. Latar disesuaikan berdasarkan variant tint. */
export function TintCard({ variant, children, className = '', onClick }: TintCardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'rounded-xl shadow-card border border-line text-ink-900',
        variantMap[variant],
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
