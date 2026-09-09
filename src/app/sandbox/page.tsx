import type { Metadata } from 'next';
import { Terminal, Play } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sandbox — Lazynext',
  description: 'Execute code in an isolated sandbox environment with resource limits.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SandboxService } from '@/lib/services/sandbox';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { SandboxClient } from './SandboxClient';

export const dynamic = 'force-dynamic';

export default async function SandboxPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Sandbox</h1>
          <p className="text-sm text-fg-secondary mt-1">Execute code in an isolated sandbox environment with resource limits.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Terminal}
            title="No workspace yet"
            description="Create a company first, then use the sandbox to execute code."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];

  // Fetch recent runs and stats for the default workspace
  const [runs, stats, quota] = await Promise.all([
    SandboxService.listRuns(defaultWorkspace.id, { take: 20 }),
    SandboxService.getStats(defaultWorkspace.id),
    SandboxService.checkQuota(defaultWorkspace.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl">Sandbox</h1>
          <p className="text-sm text-fg-secondary mt-1">Execute code in an isolated sandbox environment with resource limits.</p>
        </div>
        <Badge variant="info" className="text-xs">
          <Play className="h-3 w-3 mr-1" /> {quota.remaining} runs left today
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Terminal className="h-3 w-3" /> Total Runs
          </div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Play className="h-3 w-3" /> Success Rate
          </div>
          <div className="text-2xl font-semibold">{stats.successRate.toFixed(1)}%</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Terminal className="h-3 w-3" /> Avg Duration
          </div>
          <div className="text-2xl font-semibold">{stats.avgDurationMs}ms</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Terminal className="h-3 w-3" /> Daily Quota
          </div>
          <div className="text-2xl font-semibold">{quota.used}/{quota.limit}</div>
        </Card>
      </div>

      {/* Client Component */}
      <SandboxClient
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
        defaultWorkspaceId={defaultWorkspace.id}
        initialRuns={runs.map((r) => ({
          id: r.id,
          language: r.language,
          code: r.code,
          status: r.status,
          stdout: r.stdout,
          stderr: r.stderr,
          exitCode: r.exitCode,
          durationMs: r.durationMs,
          timeoutSec: r.timeoutSec,
          createdAt: r.createdAt.toISOString(),
          completedAt: r.completedAt ? r.completedAt.toISOString() : null,
        }))}
        initialStats={stats}
        initialQuota={quota}
      />
    </div>
  );
}
