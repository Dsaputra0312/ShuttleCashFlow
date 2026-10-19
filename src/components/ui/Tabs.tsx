'use client';

import React from 'react';

interface TabItem {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
}

export function Tabs({
  tabs,
  active,
  onChange,
  variant = 'pill',
  className = '',
}: TabsProps) {
  if (variant === 'underline') {
    return (
      <div
        role="tablist"
        className={[
          'flex w-full border-b border-line',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.key)}
              className={[
                'flex-1 py-2.5 text-body font-medium transition-colors focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
                isActive
                  ? 'border-b-2 border-primary-700 text-primary-700'
                  : 'text-ink-400 hover:text-ink-600',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Pill variant
  return (
    <div
      role="tablist"
      className={[
        'flex w-full rounded-lg bg-peach-100 p-1 gap-1',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={[
              'flex-1 rounded-md py-2 text-body font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              isActive
                ? 'bg-surface text-primary-700 shadow-card'
                : 'text-ink-600 hover:text-ink-900',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
