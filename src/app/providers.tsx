'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { I18nProvider } from '@/i18n/provider';
import type { Locale } from '@/i18n/messages';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/Toast';
import { WorkspaceProvider } from '@/lib/workspace-provider';

export default function Providers({
  children,
  session,
  initialLocale,
}: {
  children: React.ReactNode;
  session?: Session | null;
  initialLocale?: Locale;
}) {
  // When a session is passed from the server layout, provide it as the initial
  // value so the client renders immediately without a fetch. When null, omit
  // the prop so the provider can still fetch if needed (e.g. after sign-in).
  const sessionProps = session ? { session } : {};
  return (
    <SessionProvider {...sessionProps} refetchOnWindowFocus={false}>
      <ThemeProvider>
        <I18nProvider initialLocale={initialLocale}>
          <ToastProvider>
            <WorkspaceProvider>{children}</WorkspaceProvider>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
