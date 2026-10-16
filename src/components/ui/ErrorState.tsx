import React from 'react';
import { Button } from './Button';

interface ErrorStateProps {
  /** Error message to show */
  message?: string;
  /** Optional retry callback */
  onRetry?: () => void;
}

/**
 * Displayed in list/detail pages when an API request fails.
 * Accessible: uses role="alert" so screen readers announce the error.
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
      <span className="text-4xl mb-3" aria-hidden="true">⚠️</span>
      <p className="text-sm font-medium text-danger-600">{message}</p>
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
