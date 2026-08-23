'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { I18nProvider } from '@/i18n/provider';
import type { Locale } from '@/i18n/messages';

export default function Providers({
  children,
  session,
  initialLocale,
}: {
  children: React.ReactNode;
  session: Session | null;
  initialLocale?: Locale;
}) {
  // Both session + initialLocale are read server-side by RootLayout and passed in, so SSR and client first frame
  // share the same session state and locale → eliminates hydration mismatch (#418).
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
    </SessionProvider>
  );
}
