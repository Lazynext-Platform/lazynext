'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Sparkles } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { SkillLibrary } from '@/components/SkillLibrary';

export default function SkillsPage() {
  const { status } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);

  const title = t('skills.title') === 'skills.title' ? 'Creative Skill Library' : t('skills.title');
  const subtitle =
    t('skills.subtitle') === 'skills.subtitle'
      ? 'Composable creative workflows — chain skills into end-to-end ad pipelines.'
      : t('skills.subtitle');
  const signInPrompt = t('skills.signInPrompt');

  return (
    <div className="min-h-screen text-fg bg-app">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="pt-6 pb-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <Sparkles className="inline w-7 h-7 mr-2 text-[#00b2fc]" aria-hidden="true" />
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-fg-faint">{subtitle}</p>
        </div>

        {status === 'loading' ? (
          <div className="grid place-items-center py-32">
            <Loader2 className="h-7 w-7 animate-spin text-fg-faint" />
          </div>
        ) : status !== 'authenticated' ? (
          <div className="grid place-items-center gap-4 py-32 text-center">
            <div className="text-5xl">🔐</div>
            <p className="text-fg-faint">{signInPrompt}</p>
            <button
              onClick={() => setAuthOpen(true)}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: '#0064d9' }}
            >
              {t('common.signIn') === 'common.signIn' ? 'Sign in' : t('common.signIn')}
            </button>
          </div>
        ) : (
          <SkillLibrary />
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signin" />
    </div>
  );
}
