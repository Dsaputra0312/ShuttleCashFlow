import React from 'react';
import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppIcon } from './AppIcon';
import { Button } from './Button';

interface EmptyStateProps {
  /** Ikon Lucide untuk ditampilkan. Default: Inbox */
  icon?: LucideIcon;
  /** Pesan utama */
  message?: string;
  /** Keterangan tambahan */
  hint?: string;
  /** Tombol aksi opsional */
  action?: { label: string; onClick: () => void };
}

/**
 * Tampilan saat data kosong. Menggunakan ikon Lucide — tidak ada emoji.
 */
export function EmptyState({
  icon: IconComponent = Inbox,
  message = 'Belum ada data',
  hint,
  action,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-peach-100 text-ink-400">
        <AppIcon icon={IconComponent} size="md" strokeWidth={1.5} />
      </div>
      <p className="text-body font-medium text-ink-900">{message}</p>
      {hint && <p className="text-caption text-ink-600 mt-1">{hint}</p>}
      {action && (
        <Button
          variant="tonal"
          size="sm"
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
