'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  TrendingUp, Loader2, AlertCircle, BarChart3,
  Eye, MousePointerClick, ShoppingCart, DollarSign, Target, Fish,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';

type PerformanceSummary = {
  totalCampaigns: number;
  totalSpend: number;
  totalRevenue: number;
  overallRoas: number;
  topHooks: Array<{ value: string; avgScore: number; sampleSize: number; recommendation: string }>;
  topAngles: Array<{ value: string; avgScore: number; sampleSize: number; recommendation: string }>;
  topPlatforms: Array<{ value: string; avgScore: number; sampleSize: number; recommendation: string }>;
  recommendations: string[];
};

export default function PerformancePage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [learnings, setLearnings] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/creative/performance');
      if (!res.ok) {
        if (res.status === 401) throw new Error('auth');
        if (res.status === 402) throw new Error('credits');
        if (res.status >= 500) throw new Error('server');
        throw new Error('failed');
      }
      const j = await res.json().catch(() => ({}));
      setSummary(j?.summary ?? null);
      setLearnings(typeof j?.learnings === 'string' ? j.learnings : '');
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'auth') setError(t('common.errUnauthorized'));
      else if (code === 'credits') setError(t('common.errPaymentRequired'));
      else if (code === 'server') setError(t('common.errServer'));
      else if (e instanceof TypeError) setError(t('common.errNetwork'));
      else setError(t('perf.errFailed'));
    }
    setLoading(false);
  }, [session, t]);

  useEffect(() => { load(); }, [load]);

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-app pb-safe">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
          <h1 className="text-2xl font-bold text-fg sm:text-3xl">
            <BarChart3 className="mr-2 inline h-7 w-7 text-brand-accent" />
            {t('perf.title')}
          </h1>
          <p className="mt-2 text-sm text-fg-faint">{t('perf.signInPrompt')}</p>
          <button
            onClick={() => setAuthOpen(true)}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-bold text-white"
            style={{ background: '#0064d9' }}
          >
            {t('perf.signIn')}
          </button>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app pb-safe">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8" aria-busy={loading}>
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">
          <BarChart3 className="mr-2 inline h-7 w-7 text-brand-accent" />
          {t('perf.title')}
        </h1>
        <p className="mt-2 text-sm text-fg-faint">
          {t('perf.subtitle')}
        </p>

        {loading && <Loader2 className="mt-6 h-6 w-6 animate-spin text-brand-accent" role="status" aria-label={t('common.loadingDots')} />}

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            <AlertCircle className="mr-2 inline h-4 w-4" /> {error}
          </div>
        )}

        {summary && !loading && (
          <>
            {/* Overview metrics */}
            <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard icon={Target} label={t('perf.campaigns')} value={(summary.totalCampaigns ?? 0).toString()} />
              <MetricCard icon={DollarSign} label={t('perf.totalSpend')} value={`$${(summary.totalSpend ?? 0).toFixed(2)}`} />
              <MetricCard icon={TrendingUp} label={t('perf.totalRevenue')} value={`$${(summary.totalRevenue ?? 0).toFixed(2)}`} />
              <MetricCard
                icon={BarChart3}
                label={t('perf.roas')}
                value={`${(summary.overallRoas ?? 0).toFixed(2)}x`}
                highlight={(summary.overallRoas ?? 0) >= 1 ? 'positive' : 'negative'}
              />
            </section>

            {/* Recommendations */}
            {(summary.recommendations ?? []).length > 0 && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="text-sm font-bold text-fg">{t('perf.recommendations')}</h2>
                <ul className="mt-3 space-y-2">
                  {summary.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-fg">
                      <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-brand-accent" />
                      {r}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Top hooks */}
            {(summary.topHooks ?? []).length > 0 && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><Fish className="h-4 w-4 text-brand-accent" /> {t('perf.topHooks')}</h2>
                <div className="mt-3 space-y-2">
                  {summary.topHooks.map((h, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-app p-3 text-xs">
                      <span className="font-medium text-fg truncate min-w-0">{h.value}</span>
                      <div className="flex items-center gap-3 text-fg-faint">
                        <span>CTR: {(h.avgScore ?? 0).toFixed(1)}%</span>
                        <span>n={h.sampleSize ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Top angles */}
            {(summary.topAngles ?? []).length > 0 && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><Target className="h-4 w-4 text-brand-accent" /> {t('perf.topAngles')}</h2>
                <div className="mt-3 space-y-2">
                  {summary.topAngles.map((a, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-app p-3 text-xs">
                      <span className="font-medium text-fg truncate min-w-0">{a.value}</span>
                      <div className="flex items-center gap-3 text-fg-faint">
                        <span>ROAS: {(a.avgScore ?? 0).toFixed(2)}x</span>
                        <span>n={a.sampleSize ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Top platforms */}
            {(summary.topPlatforms ?? []).length > 0 && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><BarChart3 className="h-4 w-4 text-brand-accent" /> {t('perf.topPlatforms')}</h2>
                <div className="mt-3 space-y-2">
                  {summary.topPlatforms.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-app p-3 text-xs">
                      <span className="font-medium text-fg truncate min-w-0">{p.value}</span>
                      <div className="flex items-center gap-3 text-fg-faint">
                        <span>CTR: {(p.avgScore ?? 0).toFixed(1)}%</span>
                        <span>n={p.sampleSize ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Learnings context (injected into future briefs) */}
            {learnings && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="text-sm font-bold text-fg">{t('perf.learningsContext')}</h2>
                <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-app p-3 text-xs text-fg-faint">{learnings}</pre>
              </section>
            )}

            {(summary.totalCampaigns ?? 0) === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-line bg-hover p-6 text-center">
                <BarChart3 className="mx-auto mb-2 h-8 w-8 text-fg-placeholder" />
                <p className="text-sm text-fg-faint">{t('perf.noData')}</p>
                <p className="mt-1 text-xs text-fg-faint">{t('perf.noDataHint')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon, label, value, highlight,
}: { icon: typeof Eye; label: string; value: string; highlight?: 'positive' | 'negative' }) {
  const color = highlight === 'positive' ? 'text-success' : highlight === 'negative' ? 'text-danger' : 'text-fg';
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <Icon className="h-5 w-5 text-fg-faint" />
      <div className={`mt-2 text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-fg-faint">{label}</div>
    </div>
  );
}
