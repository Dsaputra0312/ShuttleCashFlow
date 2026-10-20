'use client';

import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { AppIcon } from './AppIcon';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Jika true, tombol konfirmasi menjadi destructive (merah) */
  destructive?: boolean;
  loading?: boolean;
}

/**
 * Dialog konfirmasi berbasis BottomSheet.
 * Ikon merah untuk destructive, biru untuk non-destructive.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex flex-col items-center text-center gap-3 pb-2">
        {/* Ikon */}
        <div
          className={[
            'flex h-12 w-12 items-center justify-center rounded-full',
            destructive ? 'bg-danger-tonal text-danger' : 'bg-primary-100 text-primary-700',
          ].join(' ')}
          aria-hidden="true"
        >
          <AppIcon icon={destructive ? AlertTriangle : Info} size="md" strokeWidth={2} />
        </div>

        {/* Teks */}
        <div>
          <h3 className="text-heading font-heading text-ink-900">{title}</h3>
          {description && (
            <p className="text-body text-ink-600 mt-1">{description}</p>
          )}
        </div>

        {/* Tombol */}
        <div className="flex w-full flex-col gap-2 mt-2">
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            size="md"
            onClick={onConfirm}
            loading={loading}
            className="w-full"
          >
            {confirmLabel}
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={loading}
            className="w-full"
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
