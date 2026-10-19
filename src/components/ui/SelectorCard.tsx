import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Avatar } from './Avatar';
import { AppIcon } from './AppIcon';

interface SelectorCardProps {
  name: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * Kartu pemilihan: Avatar + nama + subtitle + ikon chevron.
 * Cocok untuk memilih pemain, admin, atau entitas lain dari daftar.
 */
export function SelectorCard({
  name,
  subtitle,
  badge,
  onClick,
  className = '',
}: SelectorCardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={[
        'flex min-h-[72px] items-center gap-3',
        'bg-surface rounded-xl shadow-card border border-line p-4',
        onClick
          ? 'cursor-pointer active:bg-peach-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Avatar name={name} size="md" />

      <div className="flex-1 min-w-0">
        <p className="text-heading font-heading text-ink-900 truncate">{name}</p>
        {subtitle && (
          <p className="text-caption text-ink-600 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {badge && <div className="shrink-0">{badge}</div>}

      <AppIcon icon={ChevronRight} size="sm" className="shrink-0 text-ink-400" />
    </div>
  );
}
