'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { CalendarDays } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { ContentCalendar } from '@/components/ContentCalendar';

export default function CalendarPage() {
  const { status } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-app">
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        <a href="#main-content" className="skip-link">Skip to content</a>
        <main id="main-content" className="max-w-2xl mx-auto px-4 py-16 text-center" tabIndex={-1}>
          <CalendarDays className="mx-auto mb-4 h-10 w-10 text-brand-accent" aria-hidden="true" />
          <h1 className="text-2xl font-bold mb-2">{t('calendar.title')}</h1>
          <p className="text-sm text-fg-faint mb-6">{t('calendar.signInRequired')}</p>
          <button
            onClick={() => setAuthOpen(true)}
            className="rounded-xl bg-brand-accent px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            {t('calendar.signInRequired')}
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app">
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <a href="#main-content" className="skip-link">Skip to content</a>
      <main id="main-content" className="max-w-6xl mx-auto px-4 py-8" tabIndex={-1}>
        <ContentCalendar />
      </main>
    </div>
  );
}
