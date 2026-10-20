import React from 'react';

type ListRowVariant = 'card' | 'flat' | 'tonal';

interface ListRowProps {
  id?: string;
  /** Slot kiri: Avatar, IconTile, atau elemen lain */
  left?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Slot kanan: teks, badge, chevron, switch */
  right?: React.ReactNode;
  onPress?: () => void;
  className?: string;
  destructive?: boolean;
  variant?: ListRowVariant;
}

const variantStyles: Record<ListRowVariant, string> = {
  card: 'bg-surface rounded-2xl border border-line/80 shadow-card px-4 py-3.5 hover:shadow-float hover:border-primary-200/80 active:scale-[0.99] transition-all',
  flat: 'bg-surface border-b border-line/60 last:border-b-0 px-4 py-3.5 hover:bg-peach-50/50 transition-colors',
  tonal: 'bg-peach-100 rounded-xl px-4 py-3 border-b border-line/60 last:border-b-0 hover:bg-peach-200 transition-colors',
};

/**
 * Baris daftar modern sesuai visual reference:
 * - variant "card": kartu putih rounded-2xl melayang dengan bayangan halus (default)
 * - variant "flat": baris rata bergaris pembatas halus untuk di dalam Card
 * - variant "tonal": baris warna pastel peach-100
 */
export function ListRow({
  id,
  left,
  title,
  subtitle,
  right,
  onPress,
  className = '',
  destructive = false,
  variant = 'card',
}: ListRowProps) {
  return (
    <div
      id={id}
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
        'group flex min-h-[64px] items-center gap-3.5',
        variantStyles[variant],
        onPress
          ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {left && <div className="shrink-0">{left}</div>}

      <div className="flex-1 min-w-0">
        <p
          className={[
            'text-heading font-heading font-semibold truncate transition-colors',
            destructive
              ? 'text-danger'
              : 'text-ink-900 group-hover:text-primary-700',
          ].join(' ')}
        >
          {title}
        </p>
        {subtitle && (
          <p className="text-caption text-ink-600 mt-0.5 line-clamp-1">{subtitle}</p>
        )}
      </div>

      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
