'use client';

import React, { useEffect, useRef } from 'react';

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
        className="fixed inset-0 z-40 bg-black/50"
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
          <div className="shrink-0 border-b border-line px-4 pb-3 pt-1">
            <h2 className="text-heading font-heading text-ink-900">{title}</h2>
          </div>
        )}

        {/* Scrollable body */}
        <div
          className={[
            'overflow-y-auto p-4',
            stickyBottom ? 'max-h-[75vh]' : 'max-h-[85vh] pb-8',
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
