import React from 'react';

interface HeroCardProps {
  /** Label kecil di atas nilai */
  title?: string;
  /** Nilai utama — ditampilkan besar (display class) */
  value?: string;
  /** Keterangan di bawah nilai */
  subtitle?: string;
  /** Slot isi bebas (digunakan jika value/subtitle tidak disediakan) */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Kartu navy gelap dengan dua lingkaran dekoratif solid pink-500.
 * Tidak menggunakan gradien — semua warna solid.
 */
export function HeroCard({ title, value, subtitle, children, className = '' }: HeroCardProps) {
  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl bg-primary-700 shadow-float p-5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Dekorasi lingkaran solid — BUKAN gradient */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-pink-500 opacity-30"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-pink-500 opacity-25"
        aria-hidden="true"
      />

      {/* Konten */}
      <div className="relative z-10">
        {title && (
          <p className="text-caption text-white/70 mb-1">{title}</p>
        )}
        {value && (
          <p className="text-display font-display text-white nums leading-none">{value}</p>
        )}
        {subtitle && (
          <p className="text-caption text-white/70 mt-1">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
}
