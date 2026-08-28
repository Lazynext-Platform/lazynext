'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Trophy, FlaskConical, Loader2, AlertCircle, ArrowLeft,
  TrendingUp, BarChart3, CheckCircle2,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';

type Variant = {
  campaignId: string;
  variantLabel: string;
  name: string;
  platform: string;
  status: string;
  budgetDaily: number | null;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  roas: number;
  sampleSize: number;
};

type ABTestGroup = {
  name: string;
  variants: Variant[];
  winner: { variantLabel: string; roas: number; name: string } | null;
  isSignificant: boolean;
  confidenceLevel: number;
  totalSamples: number;
};

export default function ABTestResultsPage() {
  const { status } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<ABTestGroup[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (status !== 'authenticated') { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/creative/ab-test/results', { cache: 'no-store' });
      if (!res.ok) throw new Error('load_failed');
      const j = await res.json();
      setGroups(j.groups || []);
    } catch {
      setError('Failed to load A/B test results');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-fg-faint">{t('abTestResults.signInRequired')}</p>
          <button onClick={() => setAuthOpen(true)} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-bold text-white">
            {t('abTestResults.signIn')}
          </button>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <div id="main-content" className="min-h-screen bg-app pb-20">
      <div className="mx-auto max-w-5xl px-4 py-8" aria-busy={loading}>
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/dashboard" className="text-fg-faint hover:text-fg" aria-label={t('abTestResults.back')}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <FlaskConical className="h-6 w-6 text-brand-accent" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-fg">{t('abTestResults.title')}</h1>
        </div>

        <p className="mb-6 text-sm text-fg-faint">{t('abTestResults.description')}</p>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-accent" role="status" />
          </div>
        )}

        {/* Empty state */}
        {!loading && groups.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center">
            <BarChart3 className="mx-auto mb-3 h-10 w-10 text-fg-faint" aria-hidden="true" />
            <p className="text-sm font-medium text-fg">{t('abTestResults.empty')}</p>
            <p className="mt-1 text-xs text-fg-faint">{t('abTestResults.emptyDesc')}</p>
            <Link
              href="/creative-studio"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-accent px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              {t('abTestResults.emptyCta')}
            </Link>
          </div>
        )}

        {/* Results */}
        {!loading && groups.length > 0 && (
          <div className="space-y-6">
            {groups.map((group) => {
              const winnerLabel = group.winner?.variantLabel;
              const hasData = group.variants.some(v => v.sampleSize > 0);
              return (
                <section key={group.name} className="rounded-2xl border border-line bg-surface p-5">
                  {/* Group header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-fg">{group.name}</h2>
                      <span className="rounded bg-app border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase text-fg-faint">
                        {group.variants[0]?.platform || '—'}
                      </span>
                    </div>

                    {/* Winner badge */}
                    {group.winner && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-success/15 px-3 py-1.5 text-xs font-bold text-success" role="status">
                        <Trophy className="h-3.5 w-3.5" />
                        {t('abTestResults.winner')}: {group.winner.variantLabel}
                        <span className="ml-1 text-success/80">({group.winner.roas.toFixed(2)}x)</span>
                      </div>
                    )}
                  </div>

                  {/* Confidence indicator */}
                  <div className="mt-3 flex items-center gap-2">
                    {group.isSignificant ? (
                      <span className="flex items-center gap-1.5 rounded-lg bg-success/10 px-2.5 py-1 text-xs font-medium text-success" role="status">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('abTestResults.significant')} · {t('abTestResults.confidence', { 0: String(group.confidenceLevel) })}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-lg bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning" role="status">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {t('abTestResults.insufficientData')} · {t('abTestResults.samples', { 0: String(group.totalSamples) })}/30
                      </span>
                    )}
                  </div>

                  {/* Variant comparison table */}
                  {hasData ? (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <caption className="sr-only">{group.name} — {t('abTestResults.title')}</caption>
                        <thead>
                          <tr className="border-b border-line text-fg-faint">
                            <th scope="col" className="py-2 pr-3 font-medium">{t('abTestResults.variant')}</th>
                            <th scope="col" className="py-2 px-3 text-right font-medium">{t('abTestResults.impressions')}</th>
                            <th scope="col" className="py-2 px-3 text-right font-medium">{t('abTestResults.clicks')}</th>
                            <th scope="col" className="py-2 px-3 text-right font-medium">{t('abTestResults.ctr')}</th>
                            <th scope="col" className="py-2 px-3 text-right font-medium">{t('abTestResults.conversions')}</th>
                            <th scope="col" className="py-2 px-3 text-right font-medium">{t('abTestResults.cvr')}</th>
                            <th scope="col" className="py-2 px-3 text-right font-medium">{t('abTestResults.spend')}</th>
                            <th scope="col" className="py-2 px-3 text-right font-medium">{t('abTestResults.revenue')}</th>
                            <th scope="col" className="py-2 pl-3 text-right font-medium">{t('abTestResults.roas')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.variants.map((v) => {
                            const isWinner = winnerLabel === v.variantLabel && v.sampleSize > 0;
                            return (
                              <tr
                                key={v.campaignId}
                                className={`border-b border-line/60 ${isWinner ? 'bg-success/10' : ''}`}
                                style={isWinner ? { boxShadow: 'inset 2px 0 0 0 var(--color-success, #16a34a)' } : undefined}
                              >
                                <td className="py-2.5 pr-3 font-medium text-fg">
                                  <span className="flex items-center gap-1.5">
                                    {isWinner && <Trophy className="h-3.5 w-3.5 text-success" aria-hidden="true" />}
                                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${isWinner ? 'bg-success/20 text-success' : 'bg-app border border-line text-fg-faint'}`}>
                                      {v.variantLabel}
                                    </span>
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums text-fg">{v.impressions.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums text-fg">{v.clicks.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums text-fg-faint">{(v.ctr * 100).toFixed(2)}%</td>
                                <td className="py-2.5 px-3 text-right tabular-nums text-fg">{v.conversions.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums text-fg-faint">{(v.cvr * 100).toFixed(2)}%</td>
                                <td className="py-2.5 px-3 text-right tabular-nums text-fg">${v.spend.toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums text-fg">${v.revenue.toFixed(2)}</td>
                                <td className="py-2.5 pl-3 text-right tabular-nums font-bold text-fg">
                                  <span className={v.roas >= 1 ? 'text-success' : 'text-danger'}>
                                    {v.roas.toFixed(2)}x
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-4 flex items-center gap-1.5 text-xs text-fg-faint">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {t('abTestResults.noData')}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* Back link */}
        {!loading && (
          <div className="mt-8">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-faint transition hover:text-fg">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('abTestResults.back')}
            </Link>
          </div>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
