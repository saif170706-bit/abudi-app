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

        <title>Ibn Amer</title>
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        <link rel="preconnect" href="https://www.googleapis.com" />
        <link rel="preconnect" href="https://apis.google.com" />
        <link rel="preconnect" href="https://*.firebaseapp.com" />
        
        <link rel="apple-touch-icon" href="https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png" />
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