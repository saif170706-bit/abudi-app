import './globals.css';
import { Inter, Space_Grotesk, Amiri } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ClientLayout } from './client-layout';
import { ThemeProvider } from '@/components/theme-provider';

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontHeadline = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-headline",
})

const fontQuran = Amiri({
  subsets: ['latin', 'arabic'],
  weight: ['400', '700'],
  variable: '--font-quran',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>

        <title>Ibn Amer Institute</title>
        <meta name="description" content="Ibn Amer Institute — Hifz tracking, queue management, and learning platform." />
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=0" />
        
        {/* PWA / Mobile Meta Tags */}
        <meta name="theme-color" content="#efebe1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ibn Amer" />
        <meta name="application-name" content="Ibn Amer" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />

        <link rel="apple-touch-icon" href="/pwa/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/pwa/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/pwa/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/pwa/icon-192x192.png" />
        
        {/* Android / Chrome Specific */}
        <link rel="icon" type="image/png" sizes="192x192" href="/pwa/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/pwa/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/pwa/icon-192x192.png" />

        <link rel="preconnect" href="https://www.googleapis.com" />
        <link rel="preconnect" href="https://apis.google.com" />
        <link rel="preconnect" href="https://*.firebaseapp.com" />
        
        <link rel="stylesheet" href="/fonts-quran.css" />
      </head>
      <body className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontHeadline.variable,
          fontQuran.variable
        )} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}