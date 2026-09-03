import Link from 'next/link';
import { BarChart3, TrendingUp, FolderKanban, CheckSquare, FileText, Sparkles, Zap, Bot, ArrowRight } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Link href="/login" className="btn-primary">Sign in</Link></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  // Gather counts across workspace
  const [
    projectCount, taskCount, docCount, automationCount, agentCount,
    creationCount, completedTasks, pendingTasks, automationsEnabled, agentsRuns,
    creationsByStatus, recentCreations,
  ] = await Promise.all([
    prisma.project.count({ where: { workspaceId: { in: wsIds }, deletedAt: null } }),
    prisma.task.count({ where: { project: { workspaceId: { in: wsIds } }, deletedAt: null } }),
    prisma.document.count({ where: { workspaceId: { in: wsIds }, deletedAt: null } }),
    prisma.automation.count({ where: { workspaceId: { in: wsIds } } }),
    prisma.agentDef.count({ where: { workspaceId: { in: wsIds } } }),
    prisma.creation.count({ where: { userId: session.user.id } }),
    prisma.task.count({ where: { project: { workspaceId: { in: wsIds } }, deletedAt: null, status: 'done' } }),
    prisma.task.count({ where: { project: { workspaceId: { in: wsIds } }, deletedAt: null, status: { in: ['todo', 'in_progress'] } } }),
    prisma.automation.count({ where: { workspaceId: { in: wsIds }, enabled: true } }),
    prisma.agentRun.count({ where: { agent: { workspaceId: { in: wsIds } } } }),
    prisma.creation.groupBy({
      by: ['status'],
      where: { userId: session.user.id },
      _count: { _all: true },
    }),
    prisma.creation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, templateId: true, status: true, createdAt: true },
    }),
  ]);

  const taskCompletionRate = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

  const statusCounts: Record<string, number> = {};
  for (const s of creationsByStatus) {
    statusCounts[s.status] = s._count._all;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Analytics</h1>
        <p className="text-sm text-fg-secondary mt-1">Cross-module insights for your workspace</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-3 lg:grid-cols-6">
        <StatBox label="Projects" value={projectCount} icon={FolderKanban} />
        <StatBox label="Tasks" value={taskCount} icon={CheckSquare} />
        <StatBox label="Documents" value={docCount} icon={FileText} />
        <StatBox label="Creative" value={creationCount} icon={Sparkles} />
        <StatBox label="Automations" value={automationCount} icon={Zap} />
        <StatBox label="Agents" value={agentCount} icon={Bot} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task completion */}
        <Card className="p-5">
          <h2 className="heading-display text-sm mb-4">Task Completion</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="label-mono">Completion rate</span>
                <span className="heading-display text-lg">{taskCompletionRate}%</span>
              </div>
              <div className="h-6 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                <div
                  className="h-full"
                  style={{
                    width: `${taskCompletionRate}%`,
                    backgroundColor: 'var(--c-accent)',
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                <p className="label-mono">Completed</p>
                <p className="heading-display text-xl">{completedTasks}</p>
              </div>
              <div className="p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                <p className="label-mono">Open</p>
                <p className="heading-display text-xl">{pendingTasks}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Creative status breakdown */}
        <Card className="p-5">
          <h2 className="heading-display text-sm mb-4">Creative by Status</h2>
          {Object.keys(statusCounts).length === 0 ? (
            <p className="text-sm text-fg-muted">No creative work yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => {
                const pct = creationCount > 0 ? Math.round((count / creationCount) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <Badge>{status}</Badge>
                      <span className="text-sm font-mono">{count} ({pct}%)</span>
                    </div>
                    <div className="h-4 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: 'var(--c-ink)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Automation health */}
        <Card className="p-5">
          <h2 className="heading-display text-sm mb-4">Automation Health</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
              <p className="label-mono">Enabled</p>
              <p className="heading-display text-xl">{automationsEnabled}</p>
            </div>
            <div className="p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
              <p className="label-mono">Total</p>
              <p className="heading-display text-xl">{automationCount}</p>
            </div>
          </div>
        </Card>

        {/* Agent activity */}
        <Card className="p-5">
          <h2 className="heading-display text-sm mb-4">Agent Activity</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
              <p className="label-mono">Agents</p>
              <p className="heading-display text-xl">{agentCount}</p>
            </div>
            <div className="p-3 border-2" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
              <p className="label-mono">Total runs</p>
              <p className="heading-display text-xl">{agentsRuns}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent creative activity */}
      <Card className="p-5 mt-6">
        <h2 className="heading-display text-sm mb-4">Recent Creative Activity</h2>
        {recentCreations.length === 0 ? (
          <p className="text-sm text-fg-muted">No creative work yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentCreations.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 border-2 bg-surface" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <Sparkles className="h-4 w-4 shrink-0 text-fg-muted" />
                  <span className="text-sm font-medium truncate">{c.templateId}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge>{c.status}</Badge>
                  <span className="text-xs text-fg-muted">{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }: { label: string; value: number; icon: typeof BarChart3 }) {
  return (
    <div
      className="flex flex-col gap-2 p-4 border-2 bg-surface"
      style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-hard-sm)' }}
    >
      <Icon className="h-5 w-5 text-fg-muted" />
      <div>
        <p className="heading-display text-xl">{value}</p>
        <p className="label-mono">{label}</p>
      </div>
    </div>
  );
}
