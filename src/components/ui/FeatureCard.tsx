import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { IconTile } from './IconTile';

type TintColor = 'orange' | 'lavender' | 'mint' | 'peach';

interface FeatureItem {
  tint: TintColor;
  icon: LucideIcon;
  label: string;
  description: string;
  href: string;
}

interface FeatureCardProps {
  items: FeatureItem[];
  className?: string;
}

/**
 * Grid 2×2 kartu fitur pastel. Tiap kartu: IconTile + label + deskripsi.
 * Navigasi via next/link.
 */
export function FeatureCard({ items, className = '' }: FeatureCardProps) {
  return (
    <div className={['grid grid-cols-2 gap-3', className].filter(Boolean).join(' ')}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={[
            'flex flex-col gap-2 rounded-xl p-4 border border-line shadow-card',
            'text-ink-900 hover:opacity-90 active:opacity-80',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            item.tint === 'orange' ? 'bg-tint-orange' : '',
            item.tint === 'lavender' ? 'bg-tint-lavender' : '',
            item.tint === 'mint' ? 'bg-tint-mint' : '',
            item.tint === 'peach' ? 'bg-tint-peach' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <IconTile tint={item.tint} icon={item.icon} size={40} />
          <div>
            <p className="text-heading font-heading text-ink-900">{item.label}</p>
            <p className="text-caption text-ink-600 mt-0.5">{item.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
