import React from 'react';

interface ShuttlecockIconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/** Custom SVG icon mimicking Lucide style — shuttlecock shape */
export function ShuttlecockIcon({
  size = 24,
  className = '',
  strokeWidth = 1.75,
}: ShuttlecockIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Cork base — small circle at bottom */}
      <circle cx="12" cy="19" r="2.25" />
      {/* Stem from cork to feather spread */}
      <line x1="12" y1="16.75" x2="12" y2="13" />
      {/* Feather rim — arc across top */}
      <path d="M6 8 Q12 4 18 8" />
      {/* Feather tips radiating outward */}
      <line x1="12" y1="13" x2="6" y2="8" />
      <line x1="12" y1="13" x2="8.5" y2="6.5" />
      <line x1="12" y1="13" x2="12" y2="5.5" />
      <line x1="12" y1="13" x2="15.5" y2="6.5" />
      <line x1="12" y1="13" x2="18" y2="8" />
    </svg>
  );
}
