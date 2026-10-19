'use client';

import React from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppIcon } from './AppIcon';

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

const typeConfig: Record<
  ToastType,
  { icon: LucideIcon; border: string; iconClass: string }
> = {
  success: {
    icon: Check,
    border: 'border-success',
    iconClass: 'text-success',
  },
  error: {
    icon: X,
    border: 'border-danger',
    iconClass: 'text-danger',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-warning',
    iconClass: 'text-warning',
  },
  info: {
    icon: Info,
    border: 'border-primary-500',
    iconClass: 'text-primary-700',
  },
};

export function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { icon, border, iconClass } = typeConfig[toast.type];

  return (
    <div
      role="alert"
      className={[
        'flex items-center gap-3 rounded-xl px-4 py-3',
        'min-h-[44px] w-full max-w-[360px]',
        'bg-surface border shadow-float',
        border,
      ].join(' ')}
    >
      <span className={['shrink-0', iconClass].join(' ')} aria-hidden="true">
        <AppIcon icon={icon} size="sm" strokeWidth={2} />
      </span>
      <p className="flex-1 text-body font-medium text-ink-900">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-ink-400 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        aria-label="Tutup notifikasi"
      >
        <AppIcon icon={X} size="sm" />
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
      className="fixed bottom-28 left-1/2 z-50 flex w-full max-w-[430px] -translate-x-1/2 flex-col gap-2 px-4"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
