import type { Metadata } from 'next';
import { Brain } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Learning Loop — Lazynext',
  description: 'Autonomous learning loop — outcomes, insights, and recommendations.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { CompanyService } from '@/lib/services/company';
import { WorkspaceService } from '@/lib/services/workspace';
import { LearningLoopService } from '@/lib/services/learning-loop';
import { Card, Button, EmptyState } from '@/components/ui';
import { LearningDashboard } from './LearningDashboard';

export const dynamic = 'force-dynamic';

export default async function LearningPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const companies = await CompanyService.listForUser(session.user.id);

  if (companies.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Learning Loop</h1>
          <p className="text-sm text-fg-secondary mt-1">
            Autonomous learning loop — agents evaluate outcomes, extract insights, and adjust plans.
          </p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Brain}
            title="No company yet"
            description="Create a company first to start the learning loop."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  // Get the first workspace for the first company
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const workspace = workspaces.find((w) => w.organizationId === companies[0].id) || workspaces[0];

  if (!workspace) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Learning Loop</h1>
          <p className="text-sm text-fg-secondary mt-1">
            Autonomous learning loop — agents evaluate outcomes, extract insights, and adjust plans.
          </p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Brain}
            title="No workspace yet"
            description="Create a workspace first to start the learning loop."
          />
        </Card>
      </div>
    );
  }

  const dashboard = await LearningLoopService.getLearningDashboard(
    workspace.id,
    workspace.organizationId,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Learning Loop</h1>
        <p className="text-sm text-fg-secondary mt-1">
          Autonomous learning loop — agents evaluate outcomes, extract insights, and adjust plans.
        </p>
      </div>
      <LearningDashboard
        dashboard={JSON.parse(JSON.stringify(dashboard))}
        workspaceId={workspace.id}
        organizationId={workspace.organizationId}
      />
    </div>
  );
}
