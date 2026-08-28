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
      if (!res.ok) throw new Error('fetch_failed');
      const j = await res.json();
      setSummary(j.summary as PerformanceSummary);
      setLearnings(j.learnings as string);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  if (!session?.user) {
    return (
      <main id="main-content" className="min-h-screen bg-app pb-safe">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
          <h1 className="text-2xl font-bold text-fg sm:text-3xl">
            <BarChart3 className="mr-2 inline h-7 w-7 text-brand-accent" />
            Performance Dashboard
          </h1>
          <p className="mt-2 text-sm text-fg-faint">Sign in to view your campaign performance insights.</p>
          <button
            onClick={() => setAuthOpen(true)}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-bold text-white"
            style={{ background: '#0064d9' }}
          >
            Sign in
          </button>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="min-h-screen bg-app pb-safe">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">
          <BarChart3 className="mr-2 inline h-7 w-7 text-brand-accent" />
          Performance Dashboard
        </h1>
        <p className="mt-2 text-sm text-fg-faint">
          Campaign performance insights that feed back into future creative generation.
        </p>

        {loading && <Loader2 className="mt-6 h-6 w-6 animate-spin text-brand-accent" />}

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            <AlertCircle className="mr-2 inline h-4 w-4" /> {error}
          </div>
        )}

        {summary && !loading && (
          <>
            {/* Overview metrics */}
            <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard icon={Target} label="Campaigns" value={summary.totalCampaigns.toString()} />
              <MetricCard icon={DollarSign} label="Total Spend" value={`$${summary.totalSpend.toFixed(2)}`} />
              <MetricCard icon={TrendingUp} label="Total Revenue" value={`$${summary.totalRevenue.toFixed(2)}`} />
              <MetricCard
                icon={BarChart3}
                label="ROAS"
                value={`${summary.overallRoas.toFixed(2)}x`}
                highlight={summary.overallRoas >= 1 ? 'positive' : 'negative'}
              />
            </section>

            {/* Recommendations */}
            {summary.recommendations.length > 0 && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="text-sm font-bold text-fg">Recommendations</h2>
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
            {summary.topHooks.length > 0 && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><Fish className="h-4 w-4 text-brand-accent" /> Top Hook Types</h2>
                <div className="mt-3 space-y-2">
                  {summary.topHooks.map((h, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-app p-3 text-xs">
                      <span className="font-medium text-fg">{h.value}</span>
                      <div className="flex items-center gap-3 text-fg-faint">
                        <span>CTR: {h.avgScore.toFixed(1)}%</span>
                        <span>n={h.sampleSize}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Top angles */}
            {summary.topAngles.length > 0 && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><Target className="h-4 w-4 text-brand-accent" /> Top Angles</h2>
                <div className="mt-3 space-y-2">
                  {summary.topAngles.map((a, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-app p-3 text-xs">
                      <span className="font-medium text-fg">{a.value}</span>
                      <div className="flex items-center gap-3 text-fg-faint">
                        <span>ROAS: {a.avgScore.toFixed(2)}x</span>
                        <span>n={a.sampleSize}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Top platforms */}
            {summary.topPlatforms.length > 0 && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-fg"><BarChart3 className="h-4 w-4 text-brand-accent" /> Top Platforms</h2>
                <div className="mt-3 space-y-2">
                  {summary.topPlatforms.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-app p-3 text-xs">
                      <span className="font-medium text-fg">{p.value}</span>
                      <div className="flex items-center gap-3 text-fg-faint">
                        <span>CTR: {p.avgScore.toFixed(1)}%</span>
                        <span>n={p.sampleSize}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Learnings context (injected into future briefs) */}
            {learnings && (
              <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
                <h2 className="text-sm font-bold text-fg">Learnings Context (auto-injected into future briefs)</h2>
                <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-app p-3 text-xs text-fg-faint">{learnings}</pre>
              </section>
            )}

            {summary.totalCampaigns === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-line bg-hover p-6 text-center">
                <BarChart3 className="mx-auto mb-2 h-8 w-8 text-fg-placeholder" />
                <p className="text-sm text-fg-faint">No performance data yet.</p>
                <p className="mt-1 text-xs text-fg-faint">Run ad campaigns to start collecting insights that improve future creatives.</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
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
