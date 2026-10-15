'use client';

import React from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const typeClasses: Record<ToastType, string> = {
  success: 'bg-success-600 text-white',
  error: 'bg-danger-600 text-white',
  warning: 'bg-warning-500 text-white',
  info: 'bg-primary-600 text-white',
};

const typeIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

export function ToastItem({ toast, onDismiss }: ToastItemProps) {
  return (
    <div
      role="alert"
      className={[
        'flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg',
        'min-h-[44px] max-w-[360px] w-full',
        typeClasses[toast.type],
      ].join(' ')}
    >
      <span className="shrink-0 text-lg font-bold" aria-hidden="true">
        {typeIcons[toast.type]}
      </span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-white/80 hover:text-white focus:outline-none"
        aria-label="Tutup notifikasi"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 px-4 w-full max-w-[430px]"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
