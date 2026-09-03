import Link from 'next/link';
import { Bot, Plus, Play, Cpu } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const agents = await prisma.agentDef.findMany({
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
          <h1 className="heading-display text-2xl">AI Agents</h1>
          <p className="text-sm text-fg-secondary mt-1">{agents.length} agent{agents.length !== 1 ? 's' : ''}</p>
        </div>
        <Button href="/agents/new">
          <Plus className="h-4 w-4" /> New Agent
        </Button>
      </div>

      {agents.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Bot}
            title="No AI agents yet"
            description="Create AI agents to automate tasks with custom instructions, tools, and memory. Agents can call workspace tools and interact with your data."
            action={<Button>New agent</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {agents.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start gap-4 mb-3">
                <div
                  className="flex h-10 w-10 items-center justify-center border-2 shrink-0"
                  style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                >
                  <Bot className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{a.name}</p>
                  <p className="text-xs text-fg-muted truncate flex items-center gap-1">
                    <Cpu className="h-3 w-3" /> {a.modelProvider} / {a.modelName}
                  </p>
                </div>
              </div>
              <p className="text-xs text-fg-secondary line-clamp-2 mb-3">{a.instructions}</p>
              <div className="flex items-center gap-2 pt-3 border-t-2" style={{ borderColor: 'var(--c-ink)' }}>
                <Badge>{a._count.runs} runs</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
