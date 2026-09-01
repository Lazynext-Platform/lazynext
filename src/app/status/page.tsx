'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Activity, Cloud, Database } from 'lucide-react';

type HealthCheck = { ok: boolean; latencyMs?: number; detail?: string };
type HealthResponse = {
  status: 'healthy' | 'degraded';
  timestamp: string;
  checks: {
    atlas?: HealthCheck;
    r2?: HealthCheck;
    d1?: HealthCheck;
  };
};

export default function StatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchHealth() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch health');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30_000);
    return () => clearInterval(interval);
  }, []);

  const services = [
    { key: 'atlas' as const, name: 'Atlas Cloud AI', icon: Activity, desc: 'LLM, image, and video generation' },
    { key: 'r2' as const, name: 'Cloudflare R2', icon: Cloud, desc: 'Media storage' },
    { key: 'd1' as const, name: 'Cloudflare D1', icon: Database, desc: 'Primary database' },
  ];

  return (
    <div className="min-h-screen bg-app text-fg app-grid-bg">
      <main className="mx-auto max-w-2xl px-4 py-12 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-accent" />
            System Status
          </h1>
          <p className="text-sm text-fg-muted">
            Real-time health of LazyNext services. Auto-refreshes every 30 seconds.
          </p>
        </header>

        {/* Overall status */}
        <div className={`rounded-2xl border p-6 ${health?.status === 'healthy' ? 'border-success/30 bg-success/5' : health?.status === 'degraded' ? 'border-warning/30 bg-warning/5' : 'border-line bg-popover'}`}>
          <div className="flex items-center gap-3">
            {loading ? (
              <RefreshCw className="w-6 h-6 animate-spin text-fg-muted" />
            ) : health?.status === 'healthy' ? (
              <CheckCircle2 className="w-6 h-6 text-success" />
            ) : health?.status === 'degraded' ? (
              <AlertCircle className="w-6 h-6 text-warning" />
            ) : (
              <XCircle className="w-6 h-6 text-danger" />
            )}
            <div>
              <p className="text-lg font-semibold">
                {loading ? 'Checking...' : health?.status === 'healthy' ? 'All Systems Operational' : health?.status === 'degraded' ? 'Degraded Performance' : 'Status Unavailable'}
              </p>
              {health?.timestamp && (
                <p className="text-xs text-fg-faint">
                  Last checked: {new Date(health.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-4 py-3 text-sm text-danger flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Service checks */}
        <div className="space-y-3">
          {services.map(({ key, name, icon: Icon, desc }) => {
            const check = health?.checks[key];
            return (
              <div key={key} className="rounded-xl border border-line bg-popover p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-fg-muted" />
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-fg-faint">{desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {check ? (
                      <>
                        {check.latencyMs !== undefined && (
                          <span className="text-xs text-fg-faint tabular-nums">{check.latencyMs}ms</span>
                        )}
                        {check.ok ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-success">
                            <CheckCircle2 className="w-4 h-4" /> OK
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-danger">
                            <XCircle className="w-4 h-4" /> Down
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-fg-faint">—</span>
                    )}
                  </div>
                </div>
                {check?.detail && (
                  <p className="mt-2 text-xs text-fg-faint pl-8">{check.detail}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-fg-muted hover:bg-hover transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </main>
    </div>
  );
}
