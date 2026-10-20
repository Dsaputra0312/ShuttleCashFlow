import React from 'react';
import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  /** Optional right-side "Lihat semua" link */
  action?: { label: string; href: string };
  className?: string;
}

/** Section heading row with optional right-side link. */
export function SectionHeader({ title, action, className = '' }: SectionHeaderProps) {
  return (
    <div
      className={['flex items-center justify-between mb-3', className]
        .filter(Boolean)
        .join(' ')}
    >
      <h2 className="text-heading font-heading text-ink-900">{title}</h2>
      {action && (
        <Link
          href={action.href}
          className="text-caption text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
