import './globals.css';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { LOCALES, RTL_LOCALES, type Locale, messages } from '@/i18n/messages';
import Providers from './providers';
import { ShellRouter } from '@/components/ShellRouter';
import { CookieBanner } from '@/components/CookieBanner';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { auth } from '@/../auth';


export async function generateMetadata(): Promise<Metadata> {
  const localeCookie = (await cookies()).get('locale')?.value;
  const locale = ((LOCALES as readonly string[]).includes(localeCookie || '') ? localeCookie : 'en') as Locale;
  const seo = messages[locale]?.seo || messages.en.seo;
  const siteUrl = process.env.NEXTAUTH_URL || 'https://lazynext.com';
  return {
    metadataBase: new URL(siteUrl),
    title: seo.metaTitle,
    description: seo.metaDesc,
    // Atlas OSS force-downloads media when a Referer is sent — drop it so <img>/<video> render inline.
    referrer: 'no-referrer',
    manifest: '/manifest.json',
    icons: {
      icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
      apple: [{ url: '/icon-180.png', sizes: '180px', type: 'image/png' }],
    },
    openGraph: {
      title: seo.metaTitle,
      description: seo.metaDesc,
      type: 'website',
      url: siteUrl,
      siteName: 'Lazynext',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Lazynext' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.metaTitle,
      description: seo.metaDesc,
      images: ['/og-image.png'],
    },
    alternates: {
      canonical: '/',
      languages: Object.fromEntries(LOCALES.map((l) => [l, l === 'en' ? '/' : `/${l}`])),
    },
    appleWebApp: {
      capable: true,
      title: 'Lazynext',
      statusBarStyle: 'default',
    },
    applicationName: 'Lazynext',
    formatDetection: {
      telephone: false,
    },
  };
}

export const viewport: Viewport = {
  // Updated dynamically client-side by the theme system; this is the SSR
  // fallback (matches the inline bootstrap script's dark default).
  themeColor: '#0a0a0a',
  // viewport-fit=cover so env(safe-area-inset-*) is exposed on notched /
  // rounded-corner / dynamic-island devices. Width/device-width follow the
  // device; initial-scale 1 prevents auto-zoom on input focus (iOS).
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

// Pre-hydration theme bootstrap. Runs before React mounts so the very first
// paint already has the correct data-theme / color-scheme — no flash, no
// hydration mismatch. Kept inline + synchronous for earliest execution.
const THEME_INIT_SCRIPT = `(function(){try{var k='lazynext-theme';var s=localStorage.getItem(k);var v=(s==='light'||s==='dark'||s==='system')?s:'system';var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var r=(v==='system')?(d?'dark':'light'):v;var e=document.documentElement;e.setAttribute('data-theme',r);e.setAttribute('data-theme-selected',v);e.style.colorScheme=r;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',r==='dark'?'#0a0a0a':'#f4f1ea');}catch(_){document.documentElement.setAttribute('data-theme','dark');document.documentElement.style.colorScheme='dark';}})();`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Get the session server-side and pass it to SessionProvider. This avoids
  // a separate client-side fetch to /api/auth/session which was causing worker
  // hangs on Cloudflare due to concurrent Prisma/D1 queries exceeding CPU time.
  const session = await auth().catch(() => null);
  const localeCookie = (await cookies()).get('locale')?.value;
  const initialLocale = ((LOCALES as readonly string[]).includes(localeCookie || '') ? localeCookie : 'en') as Locale;
  return (
    <html lang={initialLocale} dir={RTL_LOCALES.has(initialLocale) ? 'rtl' : 'ltr'} data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Theme bootstrap — must run before body paints to avoid FOUC. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Neo-Brutalist typography: Inter (body), Archivo Black (display), JetBrains Mono (labels) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Archivo+Black&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        <Providers session={session} initialLocale={initialLocale}>
          <ShellRouter>{children}</ShellRouter>
          <CookieBanner />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
