'use client';

import { useSession } from 'next-auth/react';
import { Clapperboard } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { ShotPlanner } from '@/components/ShotPlanner';

export default function ShotPlannerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clapperboard className="w-6 h-6" /> {t('shotPlanner.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('shotPlanner.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clapperboard className="w-6 h-6" /> {t('shotPlanner.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('shotPlanner.subtitle')}</p>
        </header>
        <ShotPlanner />
      </div>
    </div>
  );
}
