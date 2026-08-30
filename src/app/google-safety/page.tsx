'use client';

import { useSession } from 'next-auth/react';
import { Shield } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { GoogleSafetyDashboard } from '@/components/GoogleSafetyDashboard';

export default function GoogleSafetyPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" /> {t('googleSafety.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('googleSafety.signInRequired')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" /> {t('googleSafety.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('googleSafety.subtitle')}</p>
        </header>
        <GoogleSafetyDashboard />
      </div>
    </div>
  );
}
