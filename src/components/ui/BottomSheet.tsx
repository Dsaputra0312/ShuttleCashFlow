'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AppIcon } from './AppIcon';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /**
   * Konten yang ditempel di bagian bawah sheet (di luar area scroll).
   * Cocok untuk tombol aksi utama.
   */
  stickyBottom?: React.ReactNode;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  stickyBottom,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-[430px] -translate-x-1/2 flex-col rounded-t-[28px] bg-surface shadow-float"
        style={{ animation: 'sheetSlideUp 200ms ease-out' }}
      >
        {/* Handle bar */}
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>

        {title && (
          <div className="shrink-0 border-b border-line px-5 pb-3 pt-1 flex items-center justify-between">
            <h2 className="text-heading font-heading font-bold text-ink-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 -mr-1 rounded-full text-ink-400 hover:text-ink-700 hover:bg-peach-100 active:scale-95 transition-all focus:outline-none"
              aria-label="Tutup"
            >
              <AppIcon icon={X} size="sm" />
            </button>
          </div>
        )}

        {/* Scrollable body */}
        <div
          className={[
            'overflow-y-auto px-5 py-4',
            stickyBottom ? 'max-h-[70vh]' : 'max-h-[82vh] pb-8',
          ].join(' ')}
          style={{ paddingBottom: stickyBottom ? undefined : 'max(env(safe-area-inset-bottom), 32px)' }}
        >
          {children}
        </div>

        {/* Sticky bottom bar */}
        {stickyBottom && (
          <div
            className="shrink-0 border-t border-line bg-surface p-4"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            {stickyBottom}
          </div>
        )}
      </div>

      <style>{`
        @keyframes sheetSlideUp {
          from { transform: translate(-50%, 100%); }
          to   { transform: translate(-50%, 0); }
        }
      `}</style>
    </>
  );
}
