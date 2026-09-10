import Link from 'next/link';
import type { Metadata } from 'next';
import { Zap, Plus, Play, Pause, History } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Automations — Lazynext',
  description: 'Automate repetitive workflows with triggers and actions.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { safePrisma } from '@/lib/safe-prisma';
import { AutomationStats } from './AutomationStats';

export const dynamic = 'force-dynamic';

export default async function AutomationsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);
  const primaryWorkspaceId = workspaces[0]?.id;

  const [automations, recentRuns] = await Promise.all([
    safePrisma(() => prisma.automation.findMany({
      where: { workspaceId: { in: wsIds } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        _count: { select: { runs: true } },
      },
    }), []),
    safePrisma(() =>
      prisma.automationRun.findMany({
        where: { automation: { workspaceId: { in: wsIds } } },
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: { automation: { select: { id: true, name: true } } },
      }),
    []),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl">Automations</h1>
          <p className="text-sm text-fg-secondary mt-1">{automations.length} automation{automations.length !== 1 ? 's' : ''}</p>
        </div>
        <Button href="/automations/new">
          <Plus className="h-4 w-4" /> New Automation
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <AutomationStats workspaceId={primaryWorkspaceId} />
      </div>

      {automations.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Zap}
            title="No automations yet"
            description="Create automations to run workflows on triggers and schedules. Connect triggers to actions across your workspace."
            action={<Button>New automation</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {automations.map((a) => (
            <Link key={a.id} href={`/automations/${a.id}`}>
              <Card className="p-4 flex items-center gap-4 hover:bg-hover transition-colors">
                <div
                  className="flex h-10 w-10 items-center justify-center border-2 shrink-0"
                  style={{ borderColor: 'var(--c-ink)', backgroundColor: a.enabled ? 'var(--c-accent)' : 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                >
                  {a.enabled ? <Play className="h-5 w-5" style={{ color: 'var(--c-accent-fg)' }} /> : <Pause className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{a.name}</p>
                  <p className="text-xs text-fg-muted truncate font-mono">{a.trigger}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge>{a._count.runs} runs</Badge>
                  <Badge variant={a.enabled ? 'success' : 'default'}>{a.enabled ? 'ON' : 'OFF'}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Recent run history */}
      {recentRuns.length > 0 && (
        <div className="mt-10">
          <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
            <History className="h-4 w-4" /> Recent Runs
          </h2>
          <Card className="p-4">
            <div className="flex flex-col gap-2">
              {recentRuns.map((run) => {
                const variant =
                  run.status === 'completed' ? 'success' :
                  run.status === 'failed' ? 'danger' :
                  run.status === 'running' ? 'info' : 'default';
                return (
                  <Link
                    key={run.id}
                    href={`/automations/${run.automation.id}`}
                    className="flex items-center justify-between p-2 border-2 bg-surface hover:bg-hover transition-colors text-sm"
                    style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
                  >
                    <span className="truncate font-medium">{run.automation.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-fg-muted">{new Date(run.startedAt).toLocaleString()}</span>
                      <Badge variant={variant as 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'}>{run.status}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
