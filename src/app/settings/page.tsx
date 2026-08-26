'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { useI18n } from '@/i18n/provider';
import { CountrySelector } from '@/components/CountrySelector';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { AuthModal } from '@/components/AuthModal';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-bold text-white">{t('settings.title')}</h1>

      <div className="space-y-6">
        {/* Language section */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="mb-4 font-semibold text-white">{t('settings.language')}</h3>
          <LanguageSwitcher />
        </div>

        {/* Region & Currency section */}
        <CountrySelector />

        {/* Account section */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h3 className="mb-4 font-semibold text-white">{t('settings.account')}</h3>
          {status === 'authenticated' && session?.user ? (
            <div className="space-y-2 text-sm text-white/70">
              <p>{session.user.name || session.user.email}</p>
              {session.user.email && <p className="text-white/50">{session.user.email}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-white/50">{t('settings.notSignedIn')}</p>
              <button
                onClick={() => setAuthOpen(true)}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
                style={{ background: '#00b2fc' }}
              >
                {t('common.signIn')}
              </button>
            </div>
          )}
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signin" />
    </div>
  );
}
