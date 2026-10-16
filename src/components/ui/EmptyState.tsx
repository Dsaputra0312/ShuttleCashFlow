import React from 'react';

interface EmptyStateProps {
  /** Primary label shown in the empty state */
  message?: string;
  /** Optional secondary hint text */
  hint?: string;
}

/**
 * Displayed in list pages when the data set is empty.
 * Accessible: uses role="status" so screen readers announce it.
 */
export function EmptyState({
  message = 'Belum ada data',
  hint,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <span className="text-4xl mb-3" aria-hidden="true">📭</span>
      <p className="text-sm font-medium text-neutral-500">{message}</p>
      {hint && <p className="text-xs text-neutral-400 mt-1">{hint}</p>}
    </div>
  );
}
