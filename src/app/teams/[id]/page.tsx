'use client';

import { use } from 'react';
import { useSession } from 'next-auth/react';
import { Users } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { TeamWorkspace } from '@/components/TeamWorkspace';

export default function TeamWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useI18n();
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> {t('team.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('team.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <TeamWorkspace teamId={id} />
      </div>
    </div>
  );
}
