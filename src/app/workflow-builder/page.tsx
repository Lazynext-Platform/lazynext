import type { Metadata } from 'next';
import { Workflow } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Workflow Builder — Lazynext',
  description: 'Design, test, and publish automated workflows with a visual node-based editor.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WorkflowService } from '@/lib/services/workflow-service';
import { WorkflowNodeLibrary } from '@/lib/services/workflow-node-library';
import { Card, Button, EmptyState } from '@/components/ui';
import { WorkflowBuilder } from './WorkflowBuilder';

export const dynamic = 'force-dynamic';

export default async function WorkflowBuilderPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <Workflow className="h-6 w-6 text-accent-primary" />
            <h1 className="heading-display text-2xl">Workflow Builder</h1>
          </div>
          <p className="text-sm text-fg-secondary mt-1">Design, test, and publish automated workflows.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Workflow}
            title="No workspace yet"
            description="Create a company first to access the workflow builder."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [workflows, stats, nodeLibrary] = await Promise.all([
    WorkflowService.list(organizationId),
    WorkflowService.getStats(organizationId),
    Promise.resolve({
      triggerTypes: WorkflowNodeLibrary.getTriggerTypes(),
      actionTypes: WorkflowNodeLibrary.getActionTypes(),
      integrationTypes: WorkflowNodeLibrary.getIntegrationTypes(),
      conditionOperators: WorkflowNodeLibrary.getConditionOperators(),
      nodeTypes: WorkflowNodeLibrary.getAllNodeTypes(),
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Workflow className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Workflow Builder</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Design, test, and publish automated workflows with a visual node-based editor.</p>
      </div>

      <WorkflowBuilder
        organizationId={organizationId}
        workflows={workflows}
        stats={stats}
        nodeLibrary={nodeLibrary}
      />
    </div>
  );
}
