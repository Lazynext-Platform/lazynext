'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Zap,
  RefreshCw,
  Activity,
  CheckCircle,
  AlertTriangle,
  Webhook,
  Shield,
  XCircle,
  Clock,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

interface DispatchStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  successRate: number;
}

interface RecentDispatch {
  id: string;
  automationId: string;
  automationName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
}

interface HealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  down: number;
  unknown: number;
  byType: Record<string, { total: number; healthy: number; degraded: number; down: number; unknown: number }>;
}

interface DegradedIntegration {
  id: string;
  platform: string;
  status: string;
  tokenExpiresAt: string | null;
  platformUsername: string | null;
}

interface AutomationPolicy {
  id: string;
  organizationId: string;
  name: string;
  status: string;
  config: {
    maxConcurrentRuns: number;
    maxRunsPerHour: number;
    maxRunsPerDay: number;
    enabledActions: string[];
    blockedActions: string[];
    retryPolicy: { maxAttempts: number; initialDelayMs: number; maxDelayMs: number; backoffMultiplier: number };
  };
  createdAt: string;
  updatedAt: string;
}

interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
}

interface WebhookStat {
  id: string;
  url: string;
  active: boolean;
  events: string;
  lastFiredAt: string | null;
  lastStatus: number | null;
  healthy: boolean;
}

// ── Component ──

export function AutomationCenter() {
  const [stats, setStats] = useState<DispatchStats | null>(null);
  const [recent, setRecent] = useState<RecentDispatch[]>([]);
  const [failed, setFailed] = useState<RecentDispatch[]>([]);
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [degraded, setDegraded] = useState<DegradedIntegration[]>([]);
  const [policies, setPolicies] = useState<AutomationPolicy[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [showCreatePolicy, setShowCreatePolicy] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, recentRes, failedRes, healthRes, degradedRes, policiesRes] = await Promise.all([
        fetch('/api/automations/dispatch-stats?automationId=latest', { cache: 'no-store' }).catch(() => null),
        fetch('/api/automations/recent-dispatches?limit=10', { cache: 'no-store' }).catch(() => null),
        fetch('/api/automations/failed?limit=10', { cache: 'no-store' }).catch(() => null),
        fetch('/api/integration-health/summary', { cache: 'no-store' }).catch(() => null),
        fetch('/api/integration-health/degraded', { cache: 'no-store' }).catch(() => null),
        fetch('/api/automation-policies', { cache: 'no-store' }).catch(() => null),
      ]);

      if (statsRes?.ok) {
        const d = await statsRes.json();
        if (d.stats) setStats(d.stats);
      }
      if (recentRes?.ok) {
        const d = await recentRes.json();
        setRecent(d.dispatches ?? []);
      }
      if (failedRes?.ok) {
        const d = await failedRes.json();
        setFailed(d.dispatches ?? []);
      }
      if (healthRes?.ok) {
        const d = await healthRes.json();
        if (d.summary) setHealth(d.summary);
      }
      if (degradedRes?.ok) {
        const d = await degradedRes.json();
        setDegraded(d.integrations ?? []);
      }
      if (policiesRes?.ok) {
        const d = await policiesRes.json();
        setPolicies(d.policies ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRetry = async (dispatch: RecentDispatch) => {
    setRetrying(dispatch.id);
    try {
      await fetch('/api/automations/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automationId: dispatch.automationId,
          trigger: 'manual.retry',
          payload: { retryOf: dispatch.id },
        }),
      });
      await fetchAll();
    } finally {
      setRetrying(null);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="h-5 w-40 bg-surface-alt rounded mb-3 animate-pulse" />
            <div className="h-20 bg-surface-alt rounded animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    { label: 'Total Runs', value: stats?.total ?? 0, icon: Activity, variant: 'default' as const },
    { label: 'Success Rate', value: `${stats?.successRate ?? 0}%`, icon: CheckCircle, variant: 'success' as const },
    { label: 'Failed', value: stats?.failed ?? 0, icon: XCircle, variant: 'danger' as const },
    { label: 'Running', value: stats?.running ?? 0, icon: Zap, variant: 'info' as const },
  ];

  const healthCards = [
    { label: 'Healthy', value: health?.healthy ?? 0, icon: CheckCircle, variant: 'success' as const },
    { label: 'Degraded', value: health?.degraded ?? 0, icon: AlertTriangle, variant: 'warning' as const },
    { label: 'Down', value: health?.down ?? 0, icon: XCircle, variant: 'danger' as const },
    { label: 'Total', value: health?.total ?? 0, icon: Activity, variant: 'default' as const },
  ];

  return (
    <div className="grid gap-6">
      {/* Dispatch Stats */}
      <section>
        <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" /> Dispatch Stats
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statCards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-fg-secondary">{c.label}</span>
                  <Icon className="h-4 w-4 text-fg-muted" />
                </div>
                <span className="text-2xl font-semibold">{c.value}</span>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recent Dispatches */}
      <section>
        <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Recent Dispatches
        </h2>
        {recent.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Zap} title="No recent dispatches" description="Automations will appear here once dispatched." />
          </Card>
        ) : (
          <Card className="p-4">
            <div className="flex flex-col gap-2">
              {recent.map((d) => {
                const variant =
                  d.status === 'completed' ? 'success' :
                  d.status === 'failed' ? 'danger' :
                  d.status === 'running' ? 'info' : 'default';
                return (
                  <div key={d.id} className="flex items-center justify-between p-2 border-2 bg-surface text-sm" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                    <span className="truncate font-medium">{d.automationName}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-fg-muted">{new Date(d.startedAt).toLocaleString()}</span>
                      <Badge variant={variant as 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'}>{d.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </section>

      {/* Failed Dispatches */}
      <section>
        <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
          <XCircle className="h-4 w-4" /> Failed Dispatches
        </h2>
        {failed.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={CheckCircle} title="No failed dispatches" description="All recent automations completed successfully." />
          </Card>
        ) : (
          <Card className="p-4">
            <div className="flex flex-col gap-2">
              {failed.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-2 border-2 bg-surface text-sm" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="min-w-0">
                    <span className="truncate font-medium block">{d.automationName}</span>
                    <span className="text-xs text-fg-muted">{new Date(d.startedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="danger">failed</Badge>
                    <Button
                      size="sm"
                      onClick={() => handleRetry(d)}
                      disabled={retrying === d.id}
                    >
                      <RefreshCw className={`h-3 w-3 ${retrying === d.id ? 'animate-spin' : ''}`} /> Retry
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* Integration Health */}
      <section>
        <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" /> Integration Health
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          {healthCards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-fg-secondary">{c.label}</span>
                  <Icon className="h-4 w-4 text-fg-muted" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold">{c.value}</span>
                  <Badge variant={c.variant}>{c.label}</Badge>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Degraded Integrations */}
        {degraded.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Degraded Integrations
            </h3>
            <div className="flex flex-col gap-2">
              {degraded.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-2 border-2 bg-surface text-sm" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="min-w-0">
                    <span className="font-medium capitalize">{d.platform}</span>
                    {d.platformUsername && (
                      <span className="text-xs text-fg-muted ml-2">{d.platformUsername}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.tokenExpiresAt && (
                      <span className="text-xs text-fg-muted">
                        expires {new Date(d.tokenExpiresAt).toLocaleDateString()}
                      </span>
                    )}
                    <Badge variant="warning">degraded</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* Automation Policies */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="heading-display text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" /> Automation Policies
          </h2>
          <Button size="sm" onClick={() => setShowCreatePolicy((v) => !v)}>
            New Policy
          </Button>
        </div>

        {showCreatePolicy && (
          <Card className="p-4 mb-3">
            <CreatePolicyForm
              onCreated={() => {
                setShowCreatePolicy(false);
                fetchAll();
              }}
            />
          </Card>
        )}

        {policies.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Shield} title="No automation policies" description="Create execution policies to limit concurrency, rate, and allowed actions." />
          </Card>
        ) : (
          <div className="grid gap-3">
            {policies.map((p) => (
              <PolicyCard key={p.id} policy={p} onChanged={fetchAll} />
            ))}
          </div>
        )}
      </section>

      {/* Webhook Delivery Stats */}
      <section>
        <h2 className="heading-display text-sm mb-3 flex items-center gap-2">
          <Webhook className="h-4 w-4" /> Webhook Delivery
        </h2>
        <Card className="p-6">
          <EmptyState
            icon={Webhook}
            title="Webhook stats"
            description="Delivery stats for individual webhook endpoints are available on the integrations page."
            action={<Button href="/integrations">View integrations</Button>}
          />
        </Card>
      </section>
    </div>
  );
}

// ── Policy Card ──

function PolicyCard({ policy, onChanged }: { policy: AutomationPolicy; onChanged: () => void }) {
  const [checkResult, setCheckResult] = useState<PolicyCheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  const handleDelete = async () => {
    await fetch(`/api/automation-policies/${policy.id}`, { method: 'DELETE' });
    onChanged();
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold">{policy.name}</p>
          <Badge variant={policy.status === 'active' ? 'success' : 'default'}>{policy.status}</Badge>
        </div>
        <Button size="sm" variant="danger" onClick={handleDelete}>Delete</Button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div><span className="text-fg-muted">Concurrent:</span> {policy.config.maxConcurrentRuns}</div>
        <div><span className="text-fg-muted">Per hour:</span> {policy.config.maxRunsPerHour}</div>
        <div><span className="text-fg-muted">Per day:</span> {policy.config.maxRunsPerDay}</div>
        <div><span className="text-fg-muted">Retry attempts:</span> {policy.config.retryPolicy.maxAttempts}</div>
      </div>
      {policy.config.blockedActions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {policy.config.blockedActions.map((a) => (
            <Badge key={a} variant="danger">{a}</Badge>
          ))}
        </div>
      )}
      {checkResult && (
        <div className="mt-3 text-sm">
          <Badge variant={checkResult.allowed ? 'success' : 'danger'}>
            {checkResult.allowed ? 'Allowed' : 'Blocked'}
          </Badge>
          {checkResult.reason && <span className="text-xs text-fg-muted ml-2">{checkResult.reason}</span>}
        </div>
      )}
    </Card>
  );
}

// ── Create Policy Form ──

function CreatePolicyForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [maxConcurrent, setMaxConcurrent] = useState('10');
  const [maxPerHour, setMaxPerHour] = useState('100');
  const [maxPerDay, setMaxPerDay] = useState('1000');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/automation-policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          maxConcurrentRuns: parseInt(maxConcurrent, 10) || 10,
          maxRunsPerHour: parseInt(maxPerHour, 10) || 100,
          maxRunsPerDay: parseInt(maxPerDay, 10) || 1000,
        }),
      });
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="text-xs text-fg-secondary">Policy name</label>
        <input
          className="input mt-1 w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Default automation policy"
          required
        />
      </div>
      <div>
        <label className="text-xs text-fg-secondary">Max concurrent runs</label>
        <input className="input mt-1 w-full" type="number" value={maxConcurrent} onChange={(e) => setMaxConcurrent(e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-fg-secondary">Max runs per hour</label>
        <input className="input mt-1 w-full" type="number" value={maxPerHour} onChange={(e) => setMaxPerHour(e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-fg-secondary">Max runs per day</label>
        <input className="input mt-1 w-full" type="number" value={maxPerDay} onChange={(e) => setMaxPerDay(e.target.value)} />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" disabled={submitting || !name.trim()}>
          {submitting ? 'Creating…' : 'Create policy'}
        </Button>
      </div>
    </form>
  );
}
