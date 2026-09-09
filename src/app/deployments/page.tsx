import type { Metadata } from 'next';
import { Rocket, CheckCircle, AlertTriangle, Activity } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DeploymentService } from '@/lib/services/deployment';
import { Card, Badge, EmptyState } from '@/components/ui';
import DeploymentDashboard from './DeploymentDashboard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Deployments — Lazynext',
  description: 'Deployment pipeline dashboard: build, deploy, health check, and rollback.',
  robots: { index: false, follow: false },
};

export default async function DeploymentsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return (
      <div className="p-8">
        <Card className="p-8">
          <EmptyState
            icon={Rocket}
            title="Sign in required"
            description="Sign in to view the deployment pipeline."
          />
        </Card>
      </div>
    );
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const workspace = workspaces[0];

  const stats = workspace
    ? await DeploymentService.getDeploymentStats(workspace.id)
    : { total: 0, byStatus: {}, byEnvironment: {}, successRate: 0, avgDurationMs: 0 };

  const activeDeployments = workspace
    ? await Promise.all(
        ['production', 'staging', 'preview'].map((env) =>
          DeploymentService.getActiveDeployment(workspace.id, env),
        ),
      ).then((results) => results.filter(Boolean))
    : [];

  const deployments = workspace
    ? await DeploymentService.listDeployments(workspace.id, { take: 50 })
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="heading-display text-2xl flex items-center gap-2">
          <Rocket className="h-6 w-6" /> Deployments
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Deployment pipeline for Cloudflare Workers via OpenNext. Build, deploy, check health, and roll back.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Rocket className="h-3 w-3" /> Total
          </div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <CheckCircle className="h-3 w-3" /> Live
          </div>
          <div className="text-2xl font-semibold">{stats.byStatus.live || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <AlertTriangle className="h-3 w-3" /> Failed
          </div>
          <div className="text-2xl font-semibold">{stats.byStatus.failed || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Activity className="h-3 w-3" /> Success Rate
          </div>
          <div className="text-2xl font-semibold">{stats.successRate}%</div>
        </Card>
      </div>

      {/* Active deployments */}
      {activeDeployments.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Active Deployments
          </h2>
          <div className="space-y-3">
            {activeDeployments.map((dep) => {
              const d = dep as { id: string; environment: string; status: string; branch: string | null; commitSha: string | null };
              return (
                <Card key={d.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="success">
                        <CheckCircle className="h-3 w-3 mr-1" /> Live
                      </Badge>
                      <span className="text-sm font-medium capitalize">{d.environment}</span>
                      {d.branch && (
                        <span className="text-xs text-fg-secondary">{d.branch}</span>
                      )}
                      {d.commitSha && (
                        <span className="text-xs text-fg-secondary font-mono">
                          {d.commitSha.slice(0, 7)}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Dashboard with history + actions */}
      <DeploymentDashboard deployments={deployments as Array<Record<string, unknown>>} />
    </div>
  );
}
