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
  session?: Session | null;
  initialLocale?: Locale;
}) {
  // In Auth.js v5, passing session={null} tells the provider "no session" and it
  // won't fetch. Passing undefined (or omitting the prop) makes it fetch
  // /api/auth/session on mount. We omit the prop when session is null so the
  // client-side SessionProvider always fetches the live session.
  const sessionProps = session ? { session } : {};
  return (
    <SessionProvider {...sessionProps} refetchOnWindowFocus={false}>
      <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>
    </SessionProvider>
  );
}
