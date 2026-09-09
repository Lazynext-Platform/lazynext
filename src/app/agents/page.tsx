import type { Metadata } from 'next';
import { Bot, Plus, Circle, CircleDot } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Agents — Lazynext',
  description: 'Your AI workforce — agents that plan, execute, and grow your company autonomously.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { safePrisma } from '@/lib/safe-prisma';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Agents</h1>
          <p className="text-sm text-fg-secondary mt-1">Your AI workforce — agents that plan, execute, and grow your company autonomously.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Bot}
            title="No workspace yet"
            description="Create a company first, then set up your AI agents."
            action={<Button href="/company/new"><Plus className="h-4 w-4" /> Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const wsIds = workspaces.map((w) => w.id);

  const agents = await safePrisma(
    () => prisma.agentDef.findMany({
      where: { workspaceId: { in: wsIds } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    [],
  );

  // Fetch run counts per agent in parallel
  const runCounts = await Promise.all(
    agents.map((agent) =>
      safePrisma(() => prisma.agentRun.count({ where: { agentId: agent.id } }), 0),
    ),
  );

  const enabledCount = agents.filter((a) => a.enabled).length;
  const disabledCount = agents.length - enabledCount;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl">Agents</h1>
          <p className="text-sm text-fg-secondary mt-1">Your AI workforce — agents that plan, execute, and grow your company autonomously.</p>
        </div>
        <Button href="/agents/new" size="sm">
          <Plus className="h-4 w-4" /> New Agent
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Bot className="h-3 w-3" /> Total
          </div>
          <div className="text-2xl font-semibold">{agents.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <CircleDot className="h-3 w-3" /> Enabled
          </div>
          <div className="text-2xl font-semibold">{enabledCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Circle className="h-3 w-3" /> Disabled
          </div>
          <div className="text-2xl font-semibold">{disabledCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Bot className="h-3 w-3" /> Runs
          </div>
          <div className="text-2xl font-semibold">{runCounts.reduce((a, b) => a + b, 0)}</div>
        </Card>
      </div>

      {/* Agent List */}
      {agents.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={Bot}
            title="No agents yet"
            description="Set up your AI workforce. Create your first agent to start operating autonomously."
            action={<Button href="/agents/new"><Plus className="h-4 w-4" /> New Agent</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {agents.map((agent, i) => (
            <Card key={agent.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="h-4 w-4 text-fg-secondary shrink-0" />
                    <span className="text-sm font-semibold">{agent.name}</span>
                    <Badge variant="default" className="text-xs">{agent.role}</Badge>
                    <Badge variant={agent.enabled ? 'success' : 'default'} className="text-xs">
                      {agent.enabled ? 'enabled' : 'disabled'}
                    </Badge>
                  </div>
                  {agent.instructions && (
                    <p className="text-sm text-fg-secondary line-clamp-2">{agent.instructions}</p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-fg-muted">
                    <span>Model: {agent.modelName}</span>
                    <span>Runs: {runCounts[i]}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
