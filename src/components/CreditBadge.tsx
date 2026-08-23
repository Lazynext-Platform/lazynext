'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { useMounted } from '@/lib/use-mounted';

// Credit balance badge in the top-right of the immersive dark shell: reads /api/me and listens
// for the 'lazynext:credits' event to refresh after each charge. Hidden when signed out. Click to
// top up on the pricing page.
export function CreditBadge() {
  const { data: session } = useSession();
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
      title="Credits"
      className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
    >
      <Coins className="h-3.5 w-3.5" style={{ color: '#d1fe17' }} />
      {credits === null ? '·' : credits.toLocaleString()}
    </a>
  );
}
