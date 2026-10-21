import React from 'react';
import { Wallet, Wifi } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface HeroCardProps {
  /** Label kecil di atas nilai */
  title?: string;
  /** Nilai utama — ditampilkan besar */
  value?: string;
  /** Keterangan di bawah nilai */
  subtitle?: string;
  /** Ikon wallet / custom */
  icon?: LucideIcon;
  /** Slot isi bebas (digunakan jika value/subtitle tidak disediakan) */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Kartu berdesain modern terinspirasi dari aplikasi e-wallet / mobile banking.
 * Menggabungkan deep gradient, glassmorphism badge, chip aksen, dan visual contactless.
 */
export function HeroCard({
  title,
  value,
  subtitle,
  icon: Icon = Wallet,
  children,
  className = '',
}: HeroCardProps) {
  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#162557] via-[#1E3275] to-[#28408F]',
        'border border-white/20 shadow-[0_14px_30px_rgba(22,37,87,0.22)] p-4.5 sm:p-5 text-white',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Ambient gradient lighting & glowing orbs */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-6 -bottom-6 h-28 w-28 rounded-full bg-indigo-400/20 blur-xl"
        aria-hidden="true"
      />
      {/* Subtle diagonal glass sheen */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.12]"
        aria-hidden="true"
      />
      {/* Contactless waves watermark (khas kartu debit / wallet card) */}
      <div
        className="pointer-events-none absolute top-3.5 right-4 text-white/15"
        aria-hidden="true"
      >
        <Wifi className="w-4 h-4 rotate-90" />
      </div>

      {/* Konten Utama */}
      <div className="relative z-10 flex items-center justify-between gap-3 pt-0.5">
        {/* Kolom Kiri: Badge Kartu / Wallet & Subtitle */}
        <div className="min-w-0 flex-1">
          {title && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 shrink-0 shadow-2xs">
                <Icon className="w-3 h-3 text-white" />
              </div>
              <span className="text-[10px] font-bold text-white/90 tracking-normal uppercase truncate">
                {title}
              </span>
            </div>
          )}
          {subtitle && (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-xs text-[10px] font-medium text-white/85 border border-white/10 shadow-2xs">
              {subtitle}
            </div>
          )}
        </div>

        {/* Kolom Kanan: Saldo / Nilai Utama */}
        {value && (
          <div className="shrink-0 text-right">
            <p className="text-lg sm:text-xl font-bold text-white nums tracking-tight leading-none drop-shadow-xs">
              {value}
            </p>
          </div>
        )}
      </div>

      {children && <div className="relative z-10 mt-3">{children}</div>}
    </div>
  );
}
