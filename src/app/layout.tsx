import './globals.css';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { LOCALES, RTL_LOCALES, type Locale, messages } from '@/i18n/messages';
import Providers from './providers';
import { Shell } from '@/components/Shell';
import { CookieBanner } from '@/components/CookieBanner';


export async function generateMetadata(): Promise<Metadata> {
  const localeCookie = (await cookies()).get('locale')?.value;
  const locale = ((LOCALES as readonly string[]).includes(localeCookie || '') ? localeCookie : 'en') as Locale;
  const seo = (messages[locale] as any)?.seo || (messages.en as any).seo;
  const siteUrl = process.env.NEXTAUTH_URL || 'https://lazynext.com';
  return {
    metadataBase: new URL(siteUrl),
    title: seo.metaTitle,
    description: seo.metaDesc,
    // Atlas OSS force-downloads media when a Referer is sent — drop it so <img>/<video> render inline.
    referrer: 'no-referrer',
    icons: {
      icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
      apple: [{ url: '/icon-180.png', sizes: '180x180', type: 'image/png' }],
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
  };
}

export const viewport: Viewport = {
  themeColor: '#131416',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Session is fetched client-side via SessionProvider to avoid loading Prisma on every
  // page request — a critical optimization for Cloudflare Workers' CPU time limit.
  // The SessionProvider automatically fetches /api/auth/session on the client.
  // Read the user language from a cookie and render that language during SSR, then pass it to the
  // client as the first-frame initial value -> language layer SSR/client consistency.
  const localeCookie = (await cookies()).get('locale')?.value;
  const initialLocale = ((LOCALES as readonly string[]).includes(localeCookie || '') ? localeCookie : 'en') as Locale;
  return (
    <html lang={initialLocale} dir={RTL_LOCALES.has(initialLocale) ? 'rtl' : 'ltr'}>
      <head>
        {/* Space Grotesk is loaded at runtime via CDN (not downloaded at build time, to avoid
            offline/build failures behind firewalls); falls back to a system sans-serif if unavailable. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-screen flex-col font-sans" style={{ ['--font-grotesk']: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif" } as React.CSSProperties}>
        <Providers initialLocale={initialLocale}>
          <Shell>{children}</Shell>
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
