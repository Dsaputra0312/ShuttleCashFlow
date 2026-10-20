import React from 'react';

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Root page wrapper — centers content to max 430px, sets peach-50 background,
 * and adds bottom padding so content is never hidden behind the floating BottomNav.
 */
export function AppShell({ children, className = '' }: AppShellProps) {
  return (
    <div
      className={[
        'relative mx-auto min-h-screen w-full max-w-[430px] bg-peach-50 pb-28',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
