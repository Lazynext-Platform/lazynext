'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Rocket,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Loader2,
  GitBranch,
  Activity,
  HeartPulse,
  Hammer,
  Upload,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'default',
  building: 'info',
  deploying: 'info',
  live: 'success',
  failed: 'danger',
  rolled_back: 'warning',
  cancelled: 'default',
};

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  building: 'Building',
  deploying: 'Deploying',
  live: 'Live',
  failed: 'Failed',
  rolled_back: 'Rolled Back',
  cancelled: 'Cancelled',
};

const triggerLabel: Record<string, string> = {
  manual: 'Manual',
  coding_loop: 'Coding Loop',
  pr_merge: 'PR Merge',
  scheduled: 'Scheduled',
};

interface DeploymentRow {
  id: string;
  environment: string;
  status: string;
  trigger: string;
  prNumber?: number | null;
  commitSha?: string | null;
  branch?: string | null;
  healthStatus?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default function DeploymentDashboard({
  deployments: initialDeployments,
}: {
  deployments: Array<Record<string, unknown>>;
}) {
  const router = useRouter();
  const [deployments, setDeployments] = useState<DeploymentRow[]>(
    initialDeployments as unknown as DeploymentRow[],
  );
  const [environment, setEnvironment] = useState('production');
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function refreshList() {
    const res = await fetch('/api/deployments');
    const data = await res.json().catch(() => ({ deployments: [] }));
    setDeployments(data.deployments || []);
    router.refresh();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: environment.trim(),
          branch: branch.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'failed_to_create');
      }
      setSuccess(`Created ${environment} deployment.`);
      setBranch('');
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(
    id: string,
    action: 'build' | 'deploy' | 'health' | 'rollback' | 'cancel',
  ) {
    setActionLoading(`${id}:${action}`);
    setError(null);
    setSuccess(null);
    try {
      const method = action === 'health' ? 'GET' : 'POST';
      const res = await fetch(`/api/deployments/${id}/${action}`, { method });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `failed_to_${action}`);
      }
      setSuccess(`${action} completed for deployment ${id.slice(0, 8)}.`);
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* New deployment form */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          <h2 className="font-semibold">New Deployment</h2>
        </div>
        <p className="text-sm text-fg-secondary mb-4">
          Create a new deployment record. After creation, trigger a build and then deploy.
        </p>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="preview">Preview</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">Branch (optional)</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. main"
                className="w-full rounded-md border-2 bg-bg-secondary px-3 py-2 text-sm"
                style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          {success && <p className="text-xs text-success">{success}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" /> Create Deployment
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Deployment history */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Deployment History</h2>
          <Badge variant="accent">{deployments.length}</Badge>
        </div>
        {deployments.length === 0 ? (
          <EmptyState
            icon={Rocket}
            title="No deployments yet"
            description="Create a deployment above to see it appear here."
          />
        ) : (
          <div className="space-y-3">
            {deployments.map((dep) => {
              const isActive = dep.status === 'live';
              const isTerminal = ['live', 'failed', 'rolled_back', 'cancelled'].includes(dep.status);
              const isLoading = actionLoading?.startsWith(dep.id);
              return (
                <div
                  key={dep.id}
                  className="border rounded-lg p-4"
                  style={{ borderColor: 'var(--c-ink)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge variant={statusVariant[dep.status] || 'default'}>
                        {statusLabel[dep.status] || dep.status}
                      </Badge>
                      <span className="text-sm font-medium capitalize">{dep.environment}</span>
                      <span className="text-xs text-fg-secondary">
                        {triggerLabel[dep.trigger] || dep.trigger}
                      </span>
                    </div>
                    <span className="text-xs text-fg-secondary flex-shrink-0">
                      {new Date(dep.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-fg-secondary mb-3">
                    {dep.branch && (
                      <span className="inline-flex items-center gap-1">
                        <GitBranch className="h-3 w-3" /> {dep.branch}
                      </span>
                    )}
                    {dep.commitSha && (
                      <span className="font-mono">{dep.commitSha.slice(0, 7)}</span>
                    )}
                    {dep.prNumber && <span>PR #{dep.prNumber}</span>}
                    {dep.healthStatus && (
                      <span className="inline-flex items-center gap-1">
                        <HeartPulse className="h-3 w-3" /> {dep.healthStatus}
                      </span>
                    )}
                    <span>Duration: {formatDuration(dep.startedAt ?? null, dep.completedAt ?? null)}</span>
                  </div>

                  {/* Per-deployment actions */}
                  <div className="flex flex-wrap gap-2">
                    {dep.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAction(dep.id, 'build')}
                        disabled={isLoading}
                      >
                        {isLoading && actionLoading === `${dep.id}:build` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Hammer className="h-3 w-3" />
                        )}
                        Build
                      </Button>
                    )}
                    {dep.status === 'building' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAction(dep.id, 'deploy')}
                        disabled={isLoading}
                      >
                        {isLoading && actionLoading === `${dep.id}:deploy` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3" />
                        )}
                        Deploy
                      </Button>
                    )}
                    {isActive && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAction(dep.id, 'health')}
                        disabled={isLoading}
                      >
                        {isLoading && actionLoading === `${dep.id}:health` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <HeartPulse className="h-3 w-3" />
                        )}
                        Check Health
                      </Button>
                    )}
                    {(isActive || dep.status === 'failed') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAction(dep.id, 'rollback')}
                        disabled={isLoading}
                      >
                        {isLoading && actionLoading === `${dep.id}:rollback` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Rollback
                      </Button>
                    )}
                    {!isTerminal && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAction(dep.id, 'cancel')}
                        disabled={isLoading}
                      >
                        {isLoading && actionLoading === `${dep.id}:cancel` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
