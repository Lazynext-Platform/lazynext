import type { Metadata } from 'next';
import { Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Labor Relations — Lazynext',
  description: 'Manage labor unions, grievances, contracts, and disputes.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LaborRelationsService } from '@/lib/services/labor-relations-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { LaborRelationsDashboard } from './LaborRelationsDashboard';

export const dynamic = 'force-dynamic';

export default async function LaborRelationsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Labor Relations</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage labor unions, grievances, contracts, and disputes.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Users}
            title="No workspace yet"
            description="Create a company first to access labor relations management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [unions, grievances, contracts, disputes, metrics, stats] = await Promise.all([
    LaborRelationsService.listUnions(organizationId),
    LaborRelationsService.listGrievances(organizationId),
    LaborRelationsService.listContracts(organizationId),
    LaborRelationsService.listDisputes(organizationId),
    LaborRelationsService.getLaborRelationsMetrics(organizationId),
    LaborRelationsService.getLaborRelationsStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Labor Relations</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage labor unions, grievances, contracts, and disputes.</p>
      </div>

      <LaborRelationsDashboard
        organizationId={organizationId}
        unions={unions}
        grievances={grievances}
        contracts={contracts}
        disputes={disputes}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
