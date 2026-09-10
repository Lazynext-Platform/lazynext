import type { Metadata } from 'next';
import { Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Stakeholders — Lazynext',
  description: 'Manage stakeholders, engagements, sentiment, and communications.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { StakeholderService } from '@/lib/services/stakeholder-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { StakeholderDashboard } from './StakeholderDashboard';

export const dynamic = 'force-dynamic';

export default async function StakeholdersPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Stakeholders</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage stakeholders, engagements, sentiment, and communications.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Users}
            title="No workspace yet"
            description="Create a company first to access stakeholder management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [stakeholders, engagements, sentiments, communications, matrix, metrics, stats] = await Promise.all([
    StakeholderService.listStakeholders(organizationId),
    StakeholderService.listEngagements(organizationId),
    StakeholderService.listSentiments(organizationId),
    StakeholderService.listCommunications(organizationId),
    StakeholderService.getStakeholderMatrix(organizationId),
    StakeholderService.getStakeholderMetrics(organizationId),
    StakeholderService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Stakeholders</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage stakeholders, engagements, sentiment, and communications.</p>
      </div>

      <StakeholderDashboard
        organizationId={organizationId}
        stakeholders={stakeholders}
        engagements={engagements}
        sentiments={sentiments}
        communications={communications}
        matrix={matrix}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
