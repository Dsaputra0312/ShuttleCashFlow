import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppIcon } from './AppIcon';

interface TimelineItem {
  icon?: LucideIcon;
  content: React.ReactNode;
  time?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

/**
 * Daftar vertikal dengan garis dan titik di kiri.
 * Dot berwarna primary-700. Teks konten body, waktu caption.
 */
export function Timeline({ items, className = '' }: TimelineProps) {
  return (
    <ol className={['flex flex-col', className].filter(Boolean).join(' ')}>
      {items.map((item, i) => (
        <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Garis vertikal — tidak tampil di item terakhir */}
          {i < items.length - 1 && (
            <div
              className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-line"
              aria-hidden="true"
            />
          )}

          {/* Dot / icon */}
          <div className="relative z-10 flex shrink-0 flex-col items-center">
            {item.icon ? (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                <AppIcon icon={item.icon} size="sm" strokeWidth={2} />
              </div>
            ) : (
              <div
                className="mt-1 h-2 w-2 rounded-full bg-primary-700"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Konten */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="text-body text-ink-900">{item.content}</div>
            {item.time && (
              <p className="text-caption text-ink-400 mt-0.5">{item.time}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
