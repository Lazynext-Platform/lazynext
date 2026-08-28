'use client';

import { useSession } from 'next-auth/react';
import { Brain } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { MLInsightsDashboard } from '@/components/MLInsightsDashboard';

export default function MLInsightsPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="w-6 h-6" /> {t('mlInsights.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('mlInsights.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="w-6 h-6" /> {t('mlInsights.title')}</h1>
        <MLInsightsDashboard />
      </div>
    </div>
  );
}
