import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppIcon } from './AppIcon';

type TintColor = 'orange' | 'lavender' | 'mint' | 'peach';

interface IconTileProps {
  tint: TintColor;
  icon: LucideIcon | React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  size?: 40 | 48;
  className?: string;
}

const tintMap: Record<TintColor, { bg: string; text: string }> = {
  orange: { bg: 'bg-tint-orange', text: 'text-icon-orange' },
  lavender: { bg: 'bg-tint-lavender', text: 'text-icon-lavender' },
  mint: { bg: 'bg-tint-mint', text: 'text-icon-mint' },
  peach: { bg: 'bg-tint-peach', text: 'text-icon-rose' },
};

export function IconTile({ tint, icon, size = 40, className = '' }: IconTileProps) {
  const { bg, text } = tintMap[tint];
  const sizeClass = size === 48 ? 'w-12 h-12' : 'w-10 h-10';
  return (
    <div
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-xl',
        sizeClass,
        bg,
        text,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    >
      <AppIcon icon={icon} size={size === 48 ? 'md' : 'sm'} />
    </div>
  );
}
