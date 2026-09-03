'use client';

import { useState } from 'react';
import { ArrowRight, Loader2, Check } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  highlight?: boolean;
}

export function BillingClient({ packs, currentTier }: { packs: CreditPack[]; currentTier: string }) {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function buyPack(packId: string) {
    setPurchasing(packId);
    setError('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Checkout failed');
      }
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setPurchasing(null);
    }
  }

  // Map pack to tier
  const packTier = (pack: CreditPack): string => {
    if (pack.credits >= 2000) return 'elite';
    if (pack.credits >= 600) return 'pro';
    if (pack.credits >= 100) return 'starter';
    return 'free';
  };

  return (
    <div>
      {error && <p className="text-sm text-danger mb-4">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {packs.map((pack) => {
          const tier = packTier(pack);
          const isCurrent = tier === currentTier;
          return (
            <Card
              key={pack.id}
              className={`p-5 ${pack.highlight ? 'border-[3px]' : ''}`}
              style={pack.highlight ? { borderColor: 'var(--c-accent)' } : undefined}
            >
              {pack.highlight && (
                <Badge variant="success" className="mb-2">Best value</Badge>
              )}
              <h3 className="heading-display text-lg mb-1">{pack.name}</h3>
              <p className="text-3xl font-bold mb-1">${pack.priceUsd}</p>
              <p className="text-sm text-fg-secondary mb-4">{pack.credits} credits</p>
              {isCurrent ? (
                <Button variant="ghost" className="w-full" disabled>
                  <Check className="h-4 w-4" /> Current plan
                </Button>
              ) : (
                <Button
                  onClick={() => buyPack(pack.id)}
                  disabled={purchasing === pack.id}
                  className="w-full"
                >
                  {purchasing === pack.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting...</>
                  ) : (
                    <>Buy ${pack.priceUsd} <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
