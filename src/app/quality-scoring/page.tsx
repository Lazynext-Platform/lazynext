'use client';

import { useSession } from 'next-auth/react';
import { Award } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { QualityScoring } from '@/components/QualityScoring';

export default function QualityScoringPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="w-6 h-6" /> {t('qualityScoring.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('qualityScoring.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="w-6 h-6" /> {t('qualityScoring.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('qualityScoring.subtitle')}</p>
        </header>
        <QualityScoring />
      </div>
    </div>
  );
}
