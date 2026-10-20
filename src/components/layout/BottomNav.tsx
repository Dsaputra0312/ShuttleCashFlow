'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, CalendarDays, Wallet, Users, LayoutGrid } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppIcon } from '@/components/ui/AppIcon';

interface NavTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

const tabs: NavTab[] = [
  { href: '/', label: 'Beranda', icon: House },
  { href: '/pertemuan', label: 'Pertemuan', icon: CalendarDays },
  { href: '/kas', label: 'Kas', icon: Wallet },
  { href: '/pemain', label: 'Pemain', icon: Users },
  { href: '/lainnya', label: 'Lainnya', icon: LayoutGrid },
];

function BottomNavInner() {
  const pathname = usePathname();

  return (
    <>
      {tabs.map((tab) => {
        const isActive =
          tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              'group relative flex flex-1 flex-col items-center justify-center py-1 transition-all duration-200 select-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-2xl',
              'active:scale-95',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Icon container with soft active pill */}
            <div
              className={[
                'relative flex items-center justify-center w-11 h-8 rounded-full transition-all duration-200',
                isActive
                  ? 'bg-primary-100 text-primary-700 shadow-xs'
                  : 'text-ink-400 group-hover:text-ink-900 group-hover:bg-peach-100/60',
              ].join(' ')}
            >
              <AppIcon
                icon={tab.icon}
                size="md"
                strokeWidth={isActive ? 2.25 : 1.75}
              />
            </div>

            {/* Label */}
            <span
              className={[
                'text-[11px] leading-tight mt-1 transition-all duration-200',
                isActive
                  ? 'text-primary-700 font-bold tracking-tight'
                  : 'text-ink-400 font-medium group-hover:text-ink-700',
              ].join(' ')}
            >
              {tab.label}
            </span>

            {/* Sleek active capsule pill indicator below label (matches reference image) */}
            <span
              className={[
                'h-1 rounded-full bg-primary-700 mt-0.5 transition-all duration-200',
                isActive
                  ? 'w-4 opacity-100'
                  : 'w-0 opacity-0',
              ].join(' ')}
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </>
  );
}

function BottomNavFallback() {
  return (
    <>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className="flex flex-1 flex-col items-center justify-center py-1 text-ink-400 font-medium"
        >
          <div className="flex items-center justify-center w-11 h-8">
            <AppIcon icon={tab.icon} size="md" />
          </div>
          <span className="text-[11px] leading-tight mt-1">{tab.label}</span>
          <span className="h-1 w-0 mt-0.5" />
        </Link>
      ))}
    </>
  );
}

export function BottomNav() {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-32px)] max-w-[400px] -translate-x-1/2 items-center justify-around rounded-[26px] bg-white/95 backdrop-blur-xl px-2 py-1.5 shadow-[0_12px_36px_rgba(40,64,143,0.16),0_2px_8px_rgba(40,64,143,0.06)] border border-white/80 ring-1 ring-line/70"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}
    >
      <Suspense fallback={<BottomNavFallback />}>
        <BottomNavInner />
      </Suspense>
    </nav>
  );
}
