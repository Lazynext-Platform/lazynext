'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, ArrowLeft, ArrowRight, ArrowUpDown, Package } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

type ComparisonItem = {
  type: string;
  a: { id: string; name: string; metadata: Record<string, unknown> | null } | null;
  b: { id: string; name: string; metadata: Record<string, unknown> | null } | null;
  scoreA: number | null;
  scoreB: number | null;
  scoreDelta: number | null;
  onlyInA: boolean;
  onlyInB: boolean;
};

type DiffResult = {
  a: { id: string; name: string; type: string; createdAt: string };
  b: { id: string; name: string; type: string; createdAt: string };
  comparison: ComparisonItem[];
};

function typeLabel(type: string, t: (k: string) => string): string {
  switch (type) {
    case 'brief': return t('cassets.filterBrief');
    case 'hooks': return t('cassets.filterHooks');
    case 'angles': return t('cassets.filterAngles');
    case 'script': return t('cassets.filterScript');
    case 'storyboard': return 'Storyboard';
    case 'score': return t('cassets.diffScore');
    case 'variants': return t('cassets.filterVariants');
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function CreativeDiffContent() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const aId = searchParams.get('a');
  const bId = searchParams.get('b');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [diff, setDiff] = useState<DiffResult | null>(null);

  useEffect(() => {
    if (!aId || !bId) { setError('Missing asset IDs'); setLoading(false); return; }
    fetch(`/api/creative/diff?a=${aId}&b=${bId}`)
      .then(r => r.json())
      .then(j => {
        if (j.error) setError(j.error);
        else setDiff(j);
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [aId, bId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-app pb-safe">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <div className="flex items-center gap-2 text-fg-faint">
            <Loader2 className="h-5 w-5 animate-spin text-brand-accent" />
            <span className="text-sm">Loading comparison...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-app pb-safe">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <div role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            <AlertCircle className="mr-2 inline h-4 w-4" /> {error}
          </div>
          <Link
            href="/creative-assets"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-accent hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> {t('cassets.diffBack')}
          </Link>
        </div>
      </div>
    );
  }

  if (!diff) return null;

  return (
    <div className="min-h-screen bg-app pb-safe">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">
          <ArrowUpDown className="mr-2 inline h-7 w-7 text-brand-accent" />
          {t('cassets.diffTitle')}
        </h1>

        {/* Header: two packages side-by-side */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0 text-brand-accent" />
              <span className="text-sm font-bold text-fg truncate">{diff.a.name}</span>
            </div>
            <p className="mt-1 text-xs text-fg-faint">
              {new Date(diff.a.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center justify-center">
            <ArrowUpDown className="h-5 w-5 text-fg-faint" />
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0 text-brand-accent" />
              <span className="text-sm font-bold text-fg truncate">{diff.b.name}</span>
            </div>
            <p className="mt-1 text-xs text-fg-faint">
              {new Date(diff.b.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Comparison rows */}
        <div className="mt-6 space-y-3">
          {diff.comparison.map((item) => {
            const hasScore = item.type === 'score' && item.scoreA !== null && item.scoreB !== null;
            const deltaPositive = (item.scoreDelta ?? 0) > 0;
            const deltaNegative = (item.scoreDelta ?? 0) < 0;
            return (
              <div key={item.type} className="rounded-2xl border border-line bg-surface p-4">
                {/* Type label row */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-fg-faint">
                    {typeLabel(item.type, t)}
                  </span>
                  {hasScore && item.scoreDelta !== null && (
                    <span
                      className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                        deltaPositive
                          ? 'bg-success/10 text-success'
                          : deltaNegative
                            ? 'bg-danger/10 text-danger'
                            : 'bg-hover text-fg-faint'
                      }`}
                    >
                      {t('cassets.diffScoreDelta')}: {item.scoreDelta > 0 ? '+' : ''}{item.scoreDelta}
                    </span>
                  )}
                </div>

                {/* Two columns */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr]">
                  {/* Column A */}
                  <div className="rounded-xl bg-app p-3">
                    {item.a ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-fg truncate">{item.a.name}</span>
                          {item.onlyInA && (
                            <span className="rounded bg-brand-accent/10 px-1.5 py-0.5 text-[10px] text-brand-accent">
                              {t('cassets.diffOnlyInA')}
                            </span>
                          )}
                          {hasScore && item.scoreA !== null && (
                            <span className="ml-auto text-sm font-bold text-fg">
                              {item.scoreA}
                            </span>
                          )}
                        </div>
                        {item.a.metadata && (
                          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-2 text-[10px] text-fg-faint">
                            {JSON.stringify(item.a.metadata, null, 2)}
                          </pre>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-fg-faint">{t('cassets.diffMissing')} —</span>
                    )}
                  </div>

                  {/* Arrow divider */}
                  <div className="hidden items-center justify-center sm:flex">
                    <ArrowRight className="h-4 w-4 text-fg-faint" />
                  </div>

                  {/* Column B */}
                  <div className="rounded-xl bg-app p-3">
                    {item.b ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-fg truncate">{item.b.name}</span>
                          {item.onlyInB && (
                            <span className="rounded bg-brand-accent/10 px-1.5 py-0.5 text-[10px] text-brand-accent">
                              {t('cassets.diffOnlyInB')}
                            </span>
                          )}
                          {hasScore && item.scoreB !== null && (
                            <span className="ml-auto text-sm font-bold text-fg">
                              {item.scoreB}
                            </span>
                          )}
                        </div>
                        {item.b.metadata && (
                          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-2 text-[10px] text-fg-faint">
                            {JSON.stringify(item.b.metadata, null, 2)}
                          </pre>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-fg-faint">{t('cassets.diffMissing')} —</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer back link */}
        <div className="mt-6">
          <Link
            href="/creative-assets"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-accent hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> {t('cassets.diffBack')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CreativeDiffPage() {
  const { t } = useI18n();
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center text-fg-faint">
          <Loader2 className="h-6 w-6 animate-spin text-brand-accent" />
        </div>
      }
    >
      <CreativeDiffContent />
    </Suspense>
  );
}
