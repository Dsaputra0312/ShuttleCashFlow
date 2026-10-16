import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { SplashScreen } from '@/components/layout/SplashScreen';
import './globals.css';

export const metadata: Metadata = {
  title: 'ShuttleCashFlow',
  description: 'Manajemen keuangan dan shuttlecock grup badminton',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ShuttleCashFlow',
    startupImage: [
      {
        url: '/images/splash.png',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full">
      <head>
        <link rel="preload" as="image" href="/images/splash.png" />
      </head>
      <body className="min-h-full bg-neutral-50 antialiased">
        <SplashScreen />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
