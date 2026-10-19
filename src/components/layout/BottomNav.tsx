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
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-3',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
              isActive
                ? 'text-primary-700 font-semibold'
                : 'text-ink-400 font-medium',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            <AppIcon icon={tab.icon} size="md" />
            <span className="text-caption leading-none">{tab.label}</span>
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
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3 text-ink-400 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
        >
          <AppIcon icon={tab.icon} size="md" />
          <span className="text-caption leading-none">{tab.label}</span>
        </Link>
      ))}
    </>
  );
}

export function BottomNav() {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-40px)] max-w-[390px] -translate-x-1/2 items-center justify-around rounded-2xl bg-surface shadow-float"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      <Suspense fallback={<BottomNavFallback />}>
        <BottomNavInner />
      </Suspense>
    </nav>
  );
}
