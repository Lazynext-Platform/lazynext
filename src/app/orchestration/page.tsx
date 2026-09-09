import type { Metadata } from 'next';
import { Network } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Orchestration — Lazynext',
  description: 'Multi-agent collaboration — delegate subtasks, share context, resolve conflicts, and coordinate handoffs.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { safePrisma } from '@/lib/safe-prisma';
import { prisma } from '@/lib/prisma';
import { OrchestrationService } from '@/lib/services/orchestration';
import { AgentCommunication } from '@/lib/services/agent-communication';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { OrchestrationDashboard } from './OrchestrationDashboard';

export const dynamic = 'force-dynamic';

export default async function OrchestrationPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Orchestration</h1>
          <p className="text-sm text-fg-secondary mt-1">Multi-agent collaboration — delegate subtasks, share context, resolve conflicts, and coordinate handoffs.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Network}
            title="No workspace yet"
            description="Create a company first, then orchestrate your AI agents."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const wsIds = workspaces.map((w) => w.id);

  // Fetch agents for all workspaces
  const agents = await safePrisma(
    () => prisma.agentDef.findMany({
      where: { workspaceId: { in: wsIds }, enabled: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    [],
  );

  // Fetch goals for all workspaces' organizations
  const orgIds = [...new Set(workspaces.map((w) => w.organizationId))];
  const goals = await safePrisma(
    () => prisma.goal.findMany({
      where: { organizationId: { in: orgIds }, status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    [],
  );

  // Fetch collaborations across all workspaces
  const collaborationLists = await Promise.all(
    workspaces.map((w) => OrchestrationService.listCollaborations(w.id, { take: 20 })),
  );
  const collaborations = collaborationLists.flat();

  // Fetch agent workloads
  const workloads = await Promise.all(
    agents.slice(0, 12).map((a) => {
      const ws = workspaces.find((w) => w.id === a.workspaceId);
      return OrchestrationService.getAgentWorkload(ws?.id || wsIds[0], a.id);
    }),
  );

  // Fetch recent agent messages
  const messageLists = await Promise.all(
    workspaces.slice(0, 3).map((w) =>
      AgentCommunication.getMessages(w.id, '', { take: 20 }).catch(() => []),
    ),
  );
  const messages = messageLists.flat().slice(0, 20);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl">Orchestration</h1>
          <p className="text-sm text-fg-secondary mt-1">Multi-agent collaboration — delegate subtasks, share context, resolve conflicts, and coordinate handoffs.</p>
        </div>
      </div>

      <OrchestrationDashboard
        workspaces={workspaces.map((w) => ({ id: w.id, name: w.name, organizationId: w.organizationId }))}
        agents={agents.map((a) => ({ id: a.id, name: a.name, role: a.role, workspaceId: a.workspaceId }))}
        goals={goals.map((g) => ({ id: g.id, title: g.title, description: g.description, organizationId: g.organizationId }))}
        collaborations={collaborations}
        workloads={workloads}
        messages={messages}
      />
    </div>
  );
}
