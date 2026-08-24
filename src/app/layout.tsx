import './globals.css';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { authOptions } from '@/lib/auth';
import { LOCALES, RTL_LOCALES, type Locale, messages } from '@/i18n/messages';
import Providers from './providers';
import { Shell } from '@/components/Shell';
import { CookieBanner } from '@/components/CookieBanner';


export async function generateMetadata(): Promise<Metadata> {
  const localeCookie = cookies().get('locale')?.value;
  const locale = ((LOCALES as readonly string[]).includes(localeCookie || '') ? localeCookie : 'en') as Locale;
  const seo = (messages[locale] as any)?.seo || (messages.en as any).seo;
  return {
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
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.metaTitle,
      description: seo.metaDesc,
    },
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/?locale=${l}`])),
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the real session on the server as the SessionProvider initial value so SSR and the
  // client first frame share the same session state, eliminating the next-auth SSR (loading) vs
  // client (authenticated) divergence for signed-in users (#418).
  // catch -> null: even if the SSR DB read fails, don't 500 the whole page; fall back to a
  // signed-out SSR (the client will fetch on its own).
  const session = await getServerSession(authOptions).catch(() => null);
  // Read the user language from a cookie and render that language during SSR, then pass it to the
  // client as the first-frame initial value -> language layer SSR/client consistency.
  const localeCookie = cookies().get('locale')?.value;
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
        <Providers session={session} initialLocale={initialLocale}>
          <Shell>{children}</Shell>
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
