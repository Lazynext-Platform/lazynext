import type { Metadata } from 'next';
import { Leaf } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Carbon Management — Lazynext',
  description: 'Manage carbon inventory, offsets, reduction targets, and carbon credits.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CarbonManagementService } from '@/lib/services/carbon-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { CarbonManagementDashboard } from './CarbonManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function CarbonManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Carbon Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage carbon inventory, offsets, reduction targets, and carbon credits.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Leaf}
            title="No workspace yet"
            description="Create a company first to access carbon management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [inventories, offsets, targets, credits, metrics, stats] = await Promise.all([
    CarbonManagementService.listCarbonInventories(organizationId),
    CarbonManagementService.listCarbonOffsets(organizationId),
    CarbonManagementService.listCarbonTargets(organizationId),
    CarbonManagementService.listCarbonCredits(organizationId),
    CarbonManagementService.getCarbonManagementMetrics(organizationId),
    CarbonManagementService.getCarbonManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Carbon Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage carbon inventory, offsets, reduction targets, and carbon credits.</p>
      </div>

      <CarbonManagementDashboard
        organizationId={organizationId}
        inventories={inventories}
        offsets={offsets}
        targets={targets}
        credits={credits}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
