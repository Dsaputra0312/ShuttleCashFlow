import React from 'react';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
}

/** Section wrapper with horizontal padding 20px and vertical padding 16px. */
export function Section({ children, className = '' }: SectionProps) {
  return (
    <section
      className={['px-5 py-4', className].filter(Boolean).join(' ')}
    >
      {children}
    </section>
  );
}
