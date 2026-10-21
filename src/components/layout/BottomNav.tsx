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

  const activeIndex = tabs.findIndex((tab) =>
    tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
  );
  const currentActive = activeIndex >= 0 ? activeIndex : 0;
  // Center percentage of the active tab (5 tabs: 10%, 30%, 50%, 70%, 90%)
  const activePercent = currentActive * 20 + 10;
  const ActiveIcon = tabs[currentActive].icon;

  return (
    <div className="relative w-full">
      {/* 1. Raised Circular Floating Button (Outside overflow-hidden so it elevates above) */}
      <div
        className="pointer-events-none absolute -top-4.5 z-30 transition-all duration-300 ease-out"
        style={{
          left: `${activePercent}%`,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="w-12 h-12 rounded-full bg-white shadow-[0_8px_22px_rgba(40,64,143,0.22)] border border-line/60 flex items-center justify-center text-primary-700">
          <AppIcon
            icon={ActiveIcon}
            size="md"
            strokeWidth={2.4}
            className="w-5 h-5 text-primary-700"
          />
        </div>
      </div>

      {/* 2. Main Navbar Bar (overflow-hidden clips the scoop perfectly to rounded-[26px]) */}
      <div className="relative w-full h-[64px] rounded-[26px] bg-white shadow-[0_12px_36px_rgba(40,64,143,0.12),0_2px_8px_rgba(40,64,143,0.04)] border border-line/60 overflow-hidden flex items-center">
        {/* Curved Scoop Notch (Cutout dipped in page background color #FEF4F0) */}
        <div
          className="pointer-events-none absolute -top-[1px] z-10 transition-all duration-300 ease-out"
          style={{
            left: `${activePercent}%`,
            transform: 'translateX(-50%)',
            width: '68px',
            height: '24px',
          }}
        >
          <svg
            width="68"
            height="24"
            viewBox="0 0 68 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            {/* Scoop fill matching page canvas background */}
            <path
              d="M 0 0 C 17 0, 17 22, 34 22 C 51 22, 51 0, 68 0 Z"
              fill="#FEF4F0"
            />
            {/* Outline continuation along curve */}
            <path
              d="M 0 0 C 17 0, 17 22, 34 22 C 51 22, 51 0, 68 0"
              stroke="#F1E4DE"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
        </div>

        {/* 3. Navigation Links (5 tabs) */}
        <div className="relative z-20 flex w-full h-full items-center justify-between">
          {tabs.map((tab, idx) => {
            const isActive = idx === currentActive;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="group relative flex flex-1 h-full flex-col items-center justify-end pb-2 pt-2.5 select-none outline-none focus:outline-none"
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Inactive Icon (Faded out when active because raised circular button represents it) */}
                <div
                  className={`flex items-center justify-center h-6 mb-1 transition-all duration-200 ${
                    isActive
                      ? 'opacity-0 scale-75 pointer-events-none'
                      : 'opacity-100 scale-100 text-ink-400 group-hover:text-ink-700'
                  }`}
                >
                  <AppIcon
                    icon={tab.icon}
                    size="md"
                    strokeWidth={1.8}
                    className="w-5 h-5"
                  />
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] leading-tight transition-colors duration-200 ${
                    isActive
                      ? 'text-primary-700 font-bold tracking-tight'
                      : 'text-ink-400 font-medium group-hover:text-ink-700'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BottomNavFallback() {
  return (
    <div className="relative w-full h-[64px] rounded-[26px] bg-white shadow-card border border-line/60 flex items-center justify-between px-2">
      {tabs.map((tab) => (
        <div
          key={tab.href}
          className="flex flex-1 flex-col items-center justify-center py-2 text-ink-400"
        >
          <div className="flex items-center justify-center h-6 mb-1">
            <AppIcon icon={tab.icon} size="md" />
          </div>
          <span className="text-[10px] leading-tight">{tab.label}</span>
        </div>
      ))}
    </div>
  );
}

export function BottomNav() {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed bottom-3.5 left-1/2 z-30 w-[calc(100%-28px)] max-w-[390px] -translate-x-1/2"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      <Suspense fallback={<BottomNavFallback />}>
        <BottomNavInner />
      </Suspense>
    </nav>
  );
}
