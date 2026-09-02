'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useI18n } from '@/i18n/provider';

interface Metrics {
  range: string;
  generatedAt: string;
  users: { total: number; newInRange: number };
  pipelines: { totalRuns: number; completed: number; failed: number; running: number; successRate: number };
  creations: { total: number; completed: number; failed: number; successRate: number };
  workflowSteps: { total: number; failed: number; successRate: number };
  credits: { granted: number; spent: number; refunded: number; net: number };
}

const RANGES = [
  { id: '24h' },
  { id: '7d' },
  { id: '30d' },
];

export default function ObservabilityPage() {
  const { t } = useI18n();
  const { data: session, status } = useSession();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState('24h');

  const fetchMetrics = useCallback(async (r: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/observability/metrics?range=${r}`);
      if (res.status === 403) {
        setError(t('observability.adminRequired'));
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('fetch_failed');
      const data = await res.json();
      setMetrics(data);
    } catch {
      setError(t('observability.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMetrics(range);
    }
  }, [status, range, fetchMetrics]);

  if (status === 'loading') return <LoadingSpinner />;
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-fg">{t('observability.title')}</h1>
          <p className="text-fg-faint">{t('observability.signInPrompt')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg page-padding">
      <main id="main-content" className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-fg">{t('observability.title')}</h1>
            <p className="text-sm text-fg-faint mt-1">{t('observability.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  range === r.id ? 'text-white' : 'text-fg-faint hover:text-fg bg-surface'
                }`}
                style={range === r.id ? { background: '#0064d9' } : {}}
                aria-pressed={range === r.id}
              >
                {t(`observability.range${r.id}`)}
              </button>
            ))}
          </div>
        </header>

        {loading && <LoadingSpinner />}

        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {metrics && !loading && (
          <>
            {/* Pipeline Metrics */}
            <section className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-bold text-fg mb-4">{t('observability.pipelines')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MetricCard label={t('observability.totalRuns')} value={metrics.pipelines.totalRuns} />
                <MetricCard label={t('observability.completed')} value={metrics.pipelines.completed} color="text-success" />
                <MetricCard label={t('observability.failed')} value={metrics.pipelines.failed} color="text-danger" />
                <MetricCard label={t('observability.running')} value={metrics.pipelines.running} color="text-info" />
                <MetricCard label={t('observability.successRate')} value={`${metrics.pipelines.successRate}%`} color={metrics.pipelines.successRate >= 90 ? 'text-success' : 'text-warning'} />
              </div>
            </section>

            {/* Creation Metrics */}
            <section className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-bold text-fg mb-4">{t('observability.mediaCreations')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label={t('observability.total')} value={metrics.creations.total} />
                <MetricCard label={t('observability.completed')} value={metrics.creations.completed} color="text-success" />
                <MetricCard label={t('observability.failed')} value={metrics.creations.failed} color="text-danger" />
                <MetricCard label={t('observability.successRate')} value={`${metrics.creations.successRate}%`} color={metrics.creations.successRate >= 90 ? 'text-success' : 'text-warning'} />
              </div>
            </section>

            {/* Workflow Steps */}
            <section className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-bold text-fg mb-4">{t('observability.workflowSteps')}</h2>
              <div className="grid grid-cols-3 gap-4">
                <MetricCard label={t('observability.totalSteps')} value={metrics.workflowSteps.total} />
                <MetricCard label={t('observability.failedSteps')} value={metrics.workflowSteps.failed} color="text-danger" />
                <MetricCard label={t('observability.stepSuccessRate')} value={`${metrics.workflowSteps.successRate}%`} color={metrics.workflowSteps.successRate >= 90 ? 'text-success' : 'text-warning'} />
              </div>
            </section>

            {/* Credit Metrics */}
            <section className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-bold text-fg mb-4">{t('observability.credits')} ({metrics.range})</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label={t('observability.granted')} value={metrics.credits.granted} color="text-success" />
                <MetricCard label={t('observability.spent')} value={metrics.credits.spent} color="text-danger" />
                <MetricCard label={t('observability.refunded')} value={metrics.credits.refunded} color="text-info" />
                <MetricCard label={t('observability.net')} value={metrics.credits.net} color={metrics.credits.net >= 0 ? 'text-success' : 'text-danger'} />
              </div>
            </section>

            {/* Users */}
            <section className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-bold text-fg mb-4">{t('observability.users')}</h2>
              <div className="grid grid-cols-2 gap-4">
                <MetricCard label={t('observability.totalUsers')} value={metrics.users.total} />
                <MetricCard label={`${t('observability.newInRange')} (${metrics.range})`} value={metrics.users.newInRange} color="text-info" />
              </div>
            </section>

            <p className="text-xs text-fg-faint text-center pb-4">
              {t('observability.generatedAt')} {new Date(metrics.generatedAt).toLocaleString()}
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <p className="text-xs text-fg-faint mb-1">{label}</p>
      <p className={`text-xl font-bold ${color || 'text-fg'}`}>{value}</p>
    </div>
  );
}
