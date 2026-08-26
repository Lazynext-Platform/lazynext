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

  const gridBg = {
    backgroundColor: '#131416',
    colorScheme: 'dark',
    backgroundImage:
      'radial-gradient(70% 55% at 50% -6%, rgba(0,178,252,0.12) 0%, rgba(0,178,252,0) 60%), linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
    backgroundSize: 'auto, 44px 44px, 44px 44px',
  } as React.CSSProperties;

  return (
    <main className="min-h-screen text-[#f7f7f8]" style={gridBg}>
      <div className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <h1 className="mb-2 text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-grotesk), "Space Grotesk", system-ui, sans-serif' }}>{t('settings.title')}</h1>
        <p className="mb-8 text-sm text-white/40">{t('settings.language')} · {t('settings.account')}</p>

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
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signin" />
    </main>
  );
}
