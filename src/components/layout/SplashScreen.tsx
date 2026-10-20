'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Hanya tampilkan saat cold start (pertama kali dibuka di sesi browser/aplikasi)
    const splashShown = sessionStorage.getItem('shuttle_splash_shown');
    if (!splashShown) {
      const showTimer = setTimeout(() => {
        setIsVisible(true);
      }, 0);

      // Tampilkan selama ~1.8 detik, kemudian mulai fade out
      const fadeTimer = setTimeout(() => {
        setIsFading(true);
      }, 1800);

      // Selesai fade out (durasi 300ms), hapus dari DOM
      const removeTimer = setTimeout(() => {
        setIsVisible(false);
        sessionStorage.setItem('shuttle_splash_shown', 'true');
      }, 2100);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(fadeTimer);
        clearTimeout(removeTimer);
      };
    }
  }, []);

  const handleDismiss = () => {
    setIsFading(true);
    setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('shuttle_splash_shown', 'true');
    }, 250);
  };

  if (!isVisible) return null;

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-peach-50 transition-opacity duration-300 select-none cursor-pointer ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Splash Screen"
    >
      <div className="relative h-full w-full max-w-md mx-auto flex items-center justify-center">
        <Image
          src="/images/splash.png"
          alt="ShuttleCashFlow Splash"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 448px"
          className="object-cover sm:object-contain"
        />
      </div>
    </div>
  );
}
