'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavTab {
  href: string;
  label: string;
  icon: React.ReactNode;
}

function HomeIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7H3a1 1 0 00-1 1v11a1 1 0 001 1h18a1 1 0 001-1V8a1 1 0 00-1-1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 13a1 1 0 100 2 1 1 0 000-2z" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a1 1 0 011-1h16a1 1 0 011 1v2" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05C16.19 13.89 17 14.6 17 15.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

const tabs: NavTab[] = [
  { href: '/', label: 'Beranda', icon: <HomeIcon /> },
  { href: '/pertemuan', label: 'Pertemuan', icon: <CalendarIcon /> },
  { href: '/kas', label: 'Kas', icon: <WalletIcon /> },
  { href: '/pemain', label: 'Pemain', icon: <UsersIcon /> },
  { href: '/lainnya', label: 'Lainnya', icon: <MenuIcon /> },
];

function BottomNavInner() {
  const pathname = usePathname();

  return (
    <>
      {tabs.map((tab) => {
        const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
              isActive ? 'text-primary-600' : 'text-neutral-400',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </>
  );
}

// Fallback renders all tabs without active highlight
function BottomNavFallback() {
  return (
    <>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
        >
          {tab.icon}
          <span>{tab.label}</span>
        </Link>
      ))}
    </>
  );
}

export function BottomNav() {
  return (
    <nav
      aria-label="Navigasi utama"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-around border-t border-neutral-200 bg-white pb-safe"
    >
      <Suspense fallback={<BottomNavFallback />}>
        <BottomNavInner />
      </Suspense>
    </nav>
  );
}
