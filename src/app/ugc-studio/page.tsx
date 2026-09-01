'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Video } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { UgcAdBuilder } from '@/components/UgcAdBuilder';

export default function UgcStudioPage() {
  const { status } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="grid place-items-center py-32">
          <Loader2 className="h-7 w-7 animate-spin text-fg-faint" />
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="grid place-items-center gap-4 py-32 text-center">
          <div className="text-5xl">🔐</div>
          <h1 className="text-2xl font-bold text-fg">{t('ugcStudio.title') || 'UGC Studio'}</h1>
          <p className="text-fg-faint">
            {t('ugcStudio.signInPrompt')}
          </p>
          <button
            onClick={() => setAuthOpen(true)}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: '#0064d9' }}
          >
            {t('common.signIn') || 'Sign in'}
          </button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-24">
        {/* Header */}
        <div className="pt-6 pb-8">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'rgba(0,178,252,0.15)', color: 'var(--color-brand-accent)' }}
            >
              <Video className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t('ugcStudio.title') || 'UGC Studio'}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-fg-faint">
                {t('ugcStudio.subtitle') ||
                  'Create hook-first UGC ads with testimonial, reaction, unboxing, and before/after templates — optimized for TikTok, Reels, and Shorts.'}
              </p>
            </div>
          </div>
        </div>

        {/* Builder */}
        <UgcAdBuilder />
      </div>
    </div>
  );
}
