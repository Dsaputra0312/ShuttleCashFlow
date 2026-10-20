'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppIcon } from './AppIcon';

type TintColor = 'orange' | 'lavender' | 'mint' | 'peach';

interface QuickAction {
  /** Lucide icon or a custom ReactNode (e.g. ShuttlecockIcon) */
  icon: LucideIcon | React.ReactNode;
  tint: TintColor;
  label: string;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

const tintMap: Record<TintColor, { bg: string; text: string }> = {
  orange: { bg: 'bg-tint-orange', text: 'text-icon-orange' },
  lavender: { bg: 'bg-tint-lavender', text: 'text-icon-lavender' },
  mint: { bg: 'bg-tint-mint', text: 'text-icon-mint' },
  peach: { bg: 'bg-tint-peach', text: 'text-icon-rose' },
};

function isLucideIcon(value: unknown): value is LucideIcon {
  // Lucide icons in modern lucide-react are forwardRef objects, not plain functions
  if (typeof value === 'function') return true;
  if (value !== null && typeof value === 'object' && '$$typeof' in (value as object)) {
    const t = (value as { $$typeof: unknown }).$$typeof;
    return t === Symbol.for('react.forward_ref') || t === Symbol.for('react.memo');
  }
  return false;
}

/**
 * Kartu aksi cepat dengan grid 3 kolom dan pemisah vertikal.
 * Tiap sel: IconTile + label.
 */
export function QuickActions({ actions, className = '' }: QuickActionsProps) {
  return (
    <div
      className={[
        'bg-surface rounded-xl shadow-card border border-line overflow-hidden',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="grid grid-cols-3 divide-x divide-line">
        {actions.map((action, i) => {
          const { bg, text } = tintMap[action.tint];
          return (
            <button
              key={i}
              type="button"
              onClick={action.onClick}
              className="flex min-h-[72px] flex-col items-center justify-center gap-2 px-2 py-3 hover:bg-peach-50 active:bg-peach-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
            >
              {/* Icon tile */}
              <div
                className={[
                  'inline-flex h-10 w-10 items-center justify-center rounded-lg',
                  bg,
                  text,
                ].join(' ')}
                aria-hidden="true"
              >
                {isLucideIcon(action.icon) ? (
                  <AppIcon icon={action.icon as LucideIcon} size="sm" />
                ) : (
                  action.icon
                )}
              </div>
              <span className="text-caption font-caption text-ink-900 text-center leading-tight">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
