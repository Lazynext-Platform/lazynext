import type { Metadata } from 'next';
import { Store } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Franchise — Lazynext',
  description: 'Manage franchisees, agreements, territories, royalties, and compliance.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseService } from '@/lib/services/franchise-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { FranchiseDashboard } from './FranchiseDashboard';

export const dynamic = 'force-dynamic';

export default async function FranchisePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Franchise</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage franchisees, agreements, territories, royalties, and compliance.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Store}
            title="No workspace yet"
            description="Create a company first to access franchise management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [franchisees, agreements, territories, royalties, compliance, metrics, stats] = await Promise.all([
    FranchiseService.listFranchisees(organizationId),
    FranchiseService.listAgreements(organizationId),
    FranchiseService.listTerritories(organizationId),
    FranchiseService.listRoyalties(organizationId),
    FranchiseService.listCompliance(organizationId),
    FranchiseService.getFranchiseMetrics(organizationId),
    FranchiseService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Franchise</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage franchisees, agreements, territories, royalties, and compliance.</p>
      </div>

      <FranchiseDashboard
        organizationId={organizationId}
        franchisees={franchisees}
        agreements={agreements}
        territories={territories}
        royalties={royalties}
        compliance={compliance}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
