import type { Metadata } from 'next';
import { Store } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Franchise Development — Lazynext',
  description: 'Manage franchise units, agreements, royalties, and training programs.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseDevelopmentService } from '@/lib/services/franchise-development-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { FranchiseDevelopmentDashboard } from './FranchiseDevelopmentDashboard';

export const dynamic = 'force-dynamic';

export default async function FranchiseDevelopmentPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Franchise Development</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage franchise units, agreements, royalties, and training programs.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Store}
            title="No workspace yet"
            description="Create a company first to access franchise development management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [units, agreements, royalties, training, metrics, stats] = await Promise.all([
    FranchiseDevelopmentService.listUnits(organizationId),
    FranchiseDevelopmentService.listAgreements(organizationId),
    FranchiseDevelopmentService.listRoyalties(organizationId),
    FranchiseDevelopmentService.listTraining(organizationId),
    FranchiseDevelopmentService.getFranchiseDevelopmentMetrics(organizationId),
    FranchiseDevelopmentService.getFranchiseDevelopmentStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Franchise Development</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage franchise units, agreements, royalties, and training programs.</p>
      </div>

      <FranchiseDevelopmentDashboard
        organizationId={organizationId}
        units={units}
        agreements={agreements}
        royalties={royalties}
        training={training}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
