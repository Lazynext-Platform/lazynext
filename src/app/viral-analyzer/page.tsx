'use client';

import { useSession } from 'next-auth/react';
import { Flame } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { ViralAnalyzerStudio } from '@/components/ViralAnalyzerStudio';

export default function ViralAnalyzerPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Flame className="w-6 h-6" /> {t('viralAnalyzer.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('viralAnalyzer.signInRequired')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Flame className="w-6 h-6" /> {t('viralAnalyzer.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('viralAnalyzer.subtitle')}</p>
        </header>
        <ViralAnalyzerStudio />
      </div>
    </div>
  );
}
