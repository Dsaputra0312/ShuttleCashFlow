'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { AppIcon } from './AppIcon';

interface PageHeaderProps {
  title: string;
  /** Show back button and navigate back when clicked */
  onBack?: boolean | (() => void);
  /** Optional right-side action slot */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Modern seamless sticky page header with soft blur, rounded back button, and balanced spacing.
 */
export function PageHeader({ title, onBack, action, className = '' }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
    } else {
      router.back();
    }
  };

  const hasBack = onBack !== undefined && onBack !== false;

  return (
    <header
      className={[
        'sticky top-0 z-20 flex min-h-[56px] items-center gap-3',
        'bg-peach-50/90 backdrop-blur-md border-b border-line/50 px-4 transition-colors',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Left: back button */}
      <div className="min-w-[40px] shrink-0 flex items-center">
        {hasBack && (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface text-ink-900 shadow-xs border border-line/80 hover:bg-peach-100 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Kembali"
          >
            <AppIcon icon={ChevronLeft} size="sm" />
          </button>
        )}
      </div>

      {/* Center: title */}
      <h1 className="flex-1 text-center font-heading font-bold text-[17px] text-ink-900 truncate tracking-tight">
        {title}
      </h1>

      {/* Right: action slot */}
      <div className="min-w-[40px] shrink-0 flex items-center justify-end">
        {action ?? null}
      </div>
    </header>
  );
}
