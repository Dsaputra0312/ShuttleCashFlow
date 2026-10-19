import React from 'react';

interface ListRowProps {
  /** Slot kiri: Avatar, IconTile, atau elemen lain */
  left?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Slot kanan: teks, badge, chevron, switch */
  right?: React.ReactNode;
  onPress?: () => void;
  className?: string;
}

/**
 * Baris daftar dengan latar peach-100, slot kiri/kanan, judul dan subjudul.
 * Antar grup ListRow biasanya dibungkus Card bg-surface.
 */
export function ListRow({
  left,
  title,
  subtitle,
  right,
  onPress,
  className = '',
}: ListRowProps) {
  return (
    <div
      onClick={onPress}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onKeyDown={
        onPress
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPress();
              }
            }
          : undefined
      }
      className={[
        'flex min-h-[60px] items-center gap-3 rounded-lg px-4 py-3',
        'bg-peach-100 border-b border-line last:border-b-0',
        onPress
          ? 'cursor-pointer active:bg-peach-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {left && <div className="shrink-0">{left}</div>}

      <div className="flex-1 min-w-0">
        <p className="text-heading font-heading text-ink-900 truncate">{title}</p>
        {subtitle && (
          <p className="text-caption text-ink-600 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
