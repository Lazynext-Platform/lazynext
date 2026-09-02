'use client';

import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Scissors } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { ClipEditor } from '@/components/ClipEditor';

export default function ClipEditorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const pipelineId = searchParams.get('pipelineId') || undefined;
  const mediaUrl = searchParams.get('mediaUrl') || undefined;

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Scissors className="w-6 h-6" /> {t('clipEditor.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('clipEditor.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Scissors className="w-6 h-6" /> {t('clipEditor.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('clipEditor.subtitle')}</p>
        </header>
        <ClipEditor initialMediaUrl={mediaUrl} pipelineId={pipelineId} />
      </div>
    </div>
  );
}
