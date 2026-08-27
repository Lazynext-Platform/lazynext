'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Clock } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { useMounted } from '@/lib/use-mounted';

// "My work" entry in the fixed top-right area: shown on all immersive pages (including home)
// when signed in, links to the standalone /my-work creations page.
export function HistoryButton() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const mounted = useMounted();
  if (!mounted || !session) return null;
  return (
    <Link
      href="/my-work"
      title={t('historyButton.title')}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-elevated px-3 py-1.5 text-xs font-semibold text-fg transition hover:bg-active"
    >
      <Clock className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t('historyButton.label')}</span>
    </Link>
  );
}
