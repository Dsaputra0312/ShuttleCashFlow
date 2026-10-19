import React from 'react';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
}

const sizeMap: Record<AvatarSize, { box: string; text: string }> = {
  sm: { box: 'w-8 h-8', text: 'text-caption' },
  md: { box: 'w-10 h-10', text: 'text-caption' },
  lg: { box: 'w-12 h-12', text: 'text-body' },
};

const tintPalette: Array<{ bg: string; text: string }> = [
  { bg: 'bg-tint-orange', text: 'text-icon-orange' },
  { bg: 'bg-tint-lavender', text: 'text-icon-lavender' },
  { bg: 'bg-tint-mint', text: 'text-icon-mint' },
  { bg: 'bg-tint-peach', text: 'text-icon-rose' },
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const initials = getInitials(name);
  const palette = tintPalette[hashName(name) % tintPalette.length];
  const { box, text } = sizeMap[size];

  return (
    <div
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none',
        box,
        text,
        palette.bg,
        palette.text,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
