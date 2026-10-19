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
 * Sticky page header with optional back button, centred title, and right-side action slot.
 * Min-height 56px. Background surface, bottom border line.
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

  return (
    <header
      className={[
        'sticky top-0 z-20 flex min-h-[56px] items-center gap-2',
        'bg-surface border-b border-line px-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Left: back button */}
      <div className="min-w-[40px] shrink-0">
        {onBack !== undefined && onBack !== false && (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-900 hover:bg-peach-100 active:bg-peach-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Kembali"
          >
            <AppIcon icon={ChevronLeft} size="md" />
          </button>
        )}
      </div>

      {/* Center: title */}
      <h1 className="flex-1 text-center text-heading font-heading text-ink-900 truncate">
        {title}
      </h1>

      {/* Right: action */}
      <div className="min-w-[40px] shrink-0 flex justify-end">
        {action ?? null}
      </div>
    </header>
  );
}
