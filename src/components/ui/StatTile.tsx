import React from 'react';

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}

/** Tile statistik: label kecil, nilai besar, hint kecil. */
export function StatTile({ label, value, hint, className = '' }: StatTileProps) {
  return (
    <div
      className={[
        'bg-surface rounded-lg shadow-card border border-line p-3 text-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className="text-caption text-ink-400 mb-1">{label}</p>
      <p className="text-title font-title text-ink-900 nums">{value}</p>
      {hint && <p className="text-caption text-ink-600 mt-0.5">{hint}</p>}
    </div>
  );
}
