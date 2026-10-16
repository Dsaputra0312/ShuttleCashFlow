import React from 'react';

interface SkeletonProps {
  className?: string;
}

/** Single shimmer block */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={['animate-pulse rounded-md bg-neutral-200', className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
    />
  );
}

/** Card-shaped skeleton for list rows */
export function SkeletonCard() {
  return (
    <div
      className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 animate-pulse"
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

/** Stack of skeleton cards, defaults to 3 */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-label="Memuat..." aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
