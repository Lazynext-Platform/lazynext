'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import LoadingSpinner from '@/components/LoadingSpinner';

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
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
];

export default function ObservabilityPage() {
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
        setError('Admin access required');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('fetch_failed');
      const data = await res.json();
      setMetrics(data);
    } catch {
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMetrics(range);
    }
  }, [status, range, fetchMetrics]);

  if (status === 'loading') return <LoadingSpinner />;
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-fg-faint">Please sign in to view observability metrics.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg page-padding">
      <main id="main-content" className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-fg">Observability</h1>
            <p className="text-sm text-fg-faint mt-1">Platform metrics and health monitoring</p>
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
                {r.label}
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
              <h2 className="text-lg font-bold text-fg mb-4">Pipelines</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <MetricCard label="Total Runs" value={metrics.pipelines.totalRuns} />
                <MetricCard label="Completed" value={metrics.pipelines.completed} color="text-success" />
                <MetricCard label="Failed" value={metrics.pipelines.failed} color="text-danger" />
                <MetricCard label="Running" value={metrics.pipelines.running} color="text-info" />
                <MetricCard label="Success Rate" value={`${metrics.pipelines.successRate}%`} color={metrics.pipelines.successRate >= 90 ? 'text-success' : 'text-warning'} />
              </div>
            </section>

            {/* Creation Metrics */}
            <section className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-bold text-fg mb-4">Media Creations</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Total" value={metrics.creations.total} />
                <MetricCard label="Completed" value={metrics.creations.completed} color="text-success" />
                <MetricCard label="Failed" value={metrics.creations.failed} color="text-danger" />
                <MetricCard label="Success Rate" value={`${metrics.creations.successRate}%`} color={metrics.creations.successRate >= 90 ? 'text-success' : 'text-warning'} />
              </div>
            </section>

            {/* Workflow Steps */}
            <section className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-bold text-fg mb-4">Workflow Steps</h2>
              <div className="grid grid-cols-3 gap-4">
                <MetricCard label="Total Steps" value={metrics.workflowSteps.total} />
                <MetricCard label="Failed Steps" value={metrics.workflowSteps.failed} color="text-danger" />
                <MetricCard label="Step Success Rate" value={`${metrics.workflowSteps.successRate}%`} color={metrics.workflowSteps.successRate >= 90 ? 'text-success' : 'text-warning'} />
              </div>
            </section>

            {/* Credit Metrics */}
            <section className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-bold text-fg mb-4">Credits ({metrics.range})</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Granted" value={metrics.credits.granted} color="text-success" />
                <MetricCard label="Spent" value={metrics.credits.spent} color="text-danger" />
                <MetricCard label="Refunded" value={metrics.credits.refunded} color="text-info" />
                <MetricCard label="Net" value={metrics.credits.net} color={metrics.credits.net >= 0 ? 'text-success' : 'text-danger'} />
              </div>
            </section>

            {/* Users */}
            <section className="rounded-xl border border-border bg-surface p-6">
              <h2 className="text-lg font-bold text-fg mb-4">Users</h2>
              <div className="grid grid-cols-2 gap-4">
                <MetricCard label="Total Users" value={metrics.users.total} />
                <MetricCard label={`New (${metrics.range})`} value={metrics.users.newInRange} color="text-info" />
              </div>
            </section>

            <p className="text-xs text-fg-faint text-center pb-4">
              Generated at: {new Date(metrics.generatedAt).toLocaleString()}
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
