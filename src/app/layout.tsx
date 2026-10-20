import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { SplashScreen } from '@/components/layout/SplashScreen';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ShuttleCashFlow',
  description: 'Manajemen keuangan dan shuttlecock grup badminton',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
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
  themeColor: '#28408F',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`h-full ${plusJakartaSans.variable}`}>
      <head>
        <link rel="preload" as="image" href="/images/splash.png" />
      </head>
      <body className="min-h-full bg-peach-50 antialiased">
        <SplashScreen />
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
