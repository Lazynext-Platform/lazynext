'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Loader2, AlertCircle, MessageSquare, ArrowLeft, Star, RefreshCw } from 'lucide-react';
import { formatDateTime } from '@/lib/i18n-format';
import { useI18n } from '@/i18n/provider';

type FeedbackEntry = {
  id: string;
  feature: string;
  rating: number;
  comment: string;
  userId: string;
  timestamp: string;
};

type FeatureSummary = {
  feature: string;
  avgRating: number;
  count: number;
};

export default function AdminFeedbackPage() {
  const { status } = useSession();
  const { t } = useI18n();
  const [feedback, setFeedback] = useState<FeedbackEntry[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const load = useCallback(() => {
    setFeedback(null);
    setErrorMsg('');
    fetch('/api/feedback')
      .then((r) => {
        if (r.status === 403) { setForbidden(true); throw new Error('forbidden'); }
        if (!r.ok) throw new Error('load_failed');
        return r.json();
      })
      .then((j) => { setFeedback(j.feedback || []); })
      .catch((e) => {
        if (e.message !== 'forbidden') setErrorMsg(t('adminFeedback.loadError'));
      });
  }, [t]);

  useEffect(() => {
    if (status === 'authenticated') load();
  }, [status, load]);

  // Compute per-feature summary
  const summary: FeatureSummary[] = (() => {
    if (!feedback) return [];
    const map = new Map<string, { total: number; count: number }>();
    for (const f of feedback) {
      const cur = map.get(f.feature) || { total: 0, count: 0 };
      cur.total += f.rating;
      cur.count += 1;
      map.set(f.feature, cur);
    }
    return Array.from(map.entries())
      .map(([feature, v]) => ({ feature, avgRating: v.total / v.count, count: v.count }))
      .sort((a, b) => b.count - a.count);
  })();

  if (status === 'loading') {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-7 w-7 animate-spin text-fg-faint" /></div>;
  }

  if (forbidden) {
    return (
      <div className="grid min-h-screen place-items-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-danger" />
        <p className="text-fg-muted">{t('adminFeedback.forbidden')}</p>
        <Link href="/admin" className="text-sm text-fg-secondary underline hover:text-fg">{t('adminFeedback.back')}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg bg-app">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        <div className="pt-6 pb-6">
          <div className="mb-2 flex items-center gap-2">
            <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg">
              <ArrowLeft className="h-4 w-4" /> {t('adminFeedback.back')}
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('adminFeedback.title')}</h1>
          <p className="mt-1 text-sm text-fg-faint">{t('adminFeedback.subtitle')}</p>
        </div>

        {errorMsg && (
          <div role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Summary table */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-fg">{t('adminFeedback.summaryTitle')}</h2>
          {feedback === null ? (
            <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-fg-placeholder" /></div>
          ) : summary.length === 0 ? (
            <div className="grid place-items-center py-12 text-sm text-fg-faint">{t('adminFeedback.empty')}</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <caption className="sr-only">{t('adminFeedback.summaryCaption')}</caption>
                <thead className="bg-surface text-xs uppercase text-fg-faint">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left">{t('adminFeedback.colFeature')}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t('adminFeedback.colAvgRating')}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t('adminFeedback.colCount')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {summary.map((s) => (
                    <tr key={s.feature} className="hover:bg-hover">
                      <td className="px-4 py-3 font-medium text-fg">{s.feature}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-brand-accent">{s.avgRating.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-fg-muted">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Individual entries */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-fg">{t('adminFeedback.entriesTitle')}</h2>
            <button onClick={load} className="inline-flex items-center gap-1 rounded-lg bg-elevated px-3 py-1.5 text-xs text-fg-muted hover:bg-active">
              <RefreshCw className="h-3 w-3" /> {t('adminFeedback.refresh')}
            </button>
          </div>
          {feedback === null ? (
            <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-fg-placeholder" /></div>
          ) : feedback.length === 0 ? (
            <div className="grid place-items-center gap-2 py-12 text-sm text-fg-faint">
              <MessageSquare className="h-8 w-8 text-fg-placeholder" />
              {t('adminFeedback.empty')}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <caption className="sr-only">{t('adminFeedback.entriesCaption')}</caption>
                <thead className="bg-surface text-xs uppercase text-fg-faint">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left">{t('adminFeedback.colFeature')}</th>
                    <th scope="col" className="px-4 py-3 text-left">{t('adminFeedback.colRating')}</th>
                    <th scope="col" className="px-4 py-3 text-left">{t('adminFeedback.colComment')}</th>
                    <th scope="col" className="px-4 py-3 text-left">{t('adminFeedback.colTimestamp')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {feedback.map((f) => (
                    <tr key={f.id} className="hover:bg-hover">
                      <td className="px-4 py-3 font-medium text-fg">{f.feature}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-brand-accent">
                          <Star className="h-3 w-3 fill-current" /> {f.rating}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-xs text-fg-faint">{f.comment || '—'}</td>
                      <td className="px-4 py-3 text-xs text-fg-faint">{formatDateTime(f.timestamp, 'en')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
