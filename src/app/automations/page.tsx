import Link from 'next/link';
import { Zap, Plus, Play, Pause } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AutomationsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const automations = await prisma.automation.findMany({
    where: { workspaceId: { in: wsIds } },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { runs: true } },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl">Automations</h1>
          <p className="text-sm text-fg-secondary mt-1">{automations.length} automation{automations.length !== 1 ? 's' : ''}</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" /> New Automation
        </Button>
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
            <Card key={a.id} className="p-4 flex items-center gap-4">
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
          ))}
        </div>
      )}
    </div>
  );
}
