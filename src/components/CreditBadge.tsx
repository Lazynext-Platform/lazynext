'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { useMounted } from '@/lib/use-mounted';
import { useI18n } from '@/i18n/provider';
import { formatNumber } from '@/lib/i18n-format';

// Credit balance badge in the top-right of the immersive dark shell: reads /api/me and listens
// for the 'lazynext:credits' event to refresh after each charge. Hidden when signed out. Click to
// top up on the pricing page.
export function CreditBadge() {
  const { data: session } = useSession();
  const { locale, t } = useI18n();
  const [credits, setCredits] = useState<number | null>(null);
  const mounted = useMounted();

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/me');
      if (r.ok) setCredits((await r.json()).credits);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (session) refresh();
    else setCredits(null);
  }, [session, refresh]);

  useEffect(() => {
    const h = () => refresh();
    window.addEventListener('lazynext:credits', h);
    return () => window.removeEventListener('lazynext:credits', h);
  }, [refresh]);

  if (!mounted || !session) return null;
  return (
    <a
      href="/pricing"
      title={t('common.credits')}
      className="flex items-center gap-1.5 rounded-full bg-elevated px-3 py-1.5 text-xs font-semibold text-fg transition hover:bg-active"
    >
      <Coins className="h-3.5 w-3.5 text-brand-accent" />
      {credits === null ? '·' : formatNumber(credits, locale)}
    </a>
  );
}
