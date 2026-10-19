import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface AppIconProps {
  icon: LucideIcon;
  size?: 'sm' | 'md';
  className?: string;
  strokeWidth?: number;
}

export function AppIcon({
  icon: Icon,
  size = 'sm',
  className = '',
  strokeWidth = 1.75,
}: AppIconProps) {
  const px = size === 'md' ? 24 : 20;
  return (
    <Icon
      size={px}
      className={className}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    />
  );
}
