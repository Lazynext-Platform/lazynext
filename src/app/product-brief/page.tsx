'use client';

import { useSession } from 'next-auth/react';
import { FileText } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { ProductBriefStudio } from '@/components/ProductBriefStudio';

export default function ProductBriefPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" /> {t('productBrief.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('productBrief.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6" /> {t('productBrief.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('productBrief.subtitle')}</p>
        </header>
        <ProductBriefStudio />
      </div>
    </div>
  );
}
