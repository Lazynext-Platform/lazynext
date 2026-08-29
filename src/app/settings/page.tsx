'use client';

import { useSession } from 'next-auth/react';
import { Suspense, useState } from 'react';
import { useI18n } from '@/i18n/provider';
import { CountrySelector } from '@/components/CountrySelector';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeSelector } from '@/components/ThemeSelector';
import { AuthModal } from '@/components/AuthModal';
import { WebhooksSection } from '@/components/WebhooksSection';
import { TeamsSection } from '@/components/TeamsSection';
import { PlatformConnectionsSection } from '@/components/PlatformConnectionsSection';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <h1 className="mb-2 text-3xl font-bold text-fg" style={{ fontFamily: 'var(--font-grotesk), "Space Grotesk", system-ui, sans-serif' }}>{t('settings.title')}</h1>
        <p className="mb-8 text-sm text-fg-faint">{t('settings.language')} · {t('settings.account')}</p>

        <div className="space-y-6">
          {/* Theme section */}
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="mb-4 font-semibold text-fg">{t('settings.theme')}</h2>
            <ThemeSelector />
          </div>

          {/* Language section */}
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="mb-4 font-semibold text-fg">{t('settings.language')}</h2>
            <LanguageSwitcher />
          </div>

          {/* Region & Currency section */}
          <CountrySelector />

          {/* Account section */}
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="mb-4 font-semibold text-fg">{t('settings.account')}</h2>
            {status === 'authenticated' && session?.user ? (
              <div className="space-y-2 text-sm text-fg-secondary">
                <p>{session.user.name || session.user.email}</p>
                {session.user.email && <p className="text-fg-faint">{session.user.email}</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-fg-faint">{t('settings.notSignedIn')}</p>
                <button
                  onClick={() => setAuthOpen(true)}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
                  style={{ background: '#0064d9' }}
                >
                  {t('common.signIn')}
                </button>
              </div>
            )}
          </div>

          {/* Webhooks section */}
          {status === 'authenticated' && session?.user && <WebhooksSection />}

          {/* Publishing platform connections */}
          {status === 'authenticated' && session?.user && (
            <Suspense fallback={<div className="rounded-2xl border border-line bg-surface p-6"><p className="text-sm text-fg-faint">Loading…</p></div>}>
              <PlatformConnectionsSection />
            </Suspense>
          )}

          {/* Teams section */}
          {status === 'authenticated' && session?.user && <TeamsSection />}
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signin" />
    </div>
  );
}
