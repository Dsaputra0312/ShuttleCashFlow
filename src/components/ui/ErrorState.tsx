import React from 'react';
import { AlertCircle } from 'lucide-react';
import { AppIcon } from './AppIcon';
import { Button } from './Button';

interface ErrorStateProps {
  /** Pesan error yang ditampilkan */
  message?: string;
  /** Callback untuk mencoba lagi */
  onRetry?: () => void;
}

/**
 * Tampilan saat request API gagal. Menggunakan ikon Lucide AlertCircle — tidak ada emoji.
 * Accessible: role="alert" agar screen reader mengumumkan error.
 */
export function ErrorState({
  message = 'Terjadi kesalahan saat memuat data.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-danger-tonal text-danger">
        <AppIcon icon={AlertCircle} size="md" strokeWidth={1.5} />
      </div>
      <p className="text-body font-medium text-danger">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="mt-4"
        >
          Coba Lagi
        </Button>
      )}
    </div>
  );
}
