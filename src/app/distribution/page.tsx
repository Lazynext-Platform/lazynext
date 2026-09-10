import type { Metadata } from 'next';
import { Warehouse } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Distribution — Lazynext',
  description: 'Manage distribution centers, channels, fulfillment orders, and networks.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DistributionService } from '@/lib/services/distribution-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { DistributionDashboard } from './DistributionDashboard';

export const dynamic = 'force-dynamic';

export default async function DistributionPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Distribution</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage distribution centers, channels, fulfillment orders, and networks.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Warehouse}
            title="No workspace yet"
            description="Create a company first to access distribution management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [centers, channels, fulfillments, networks, metrics, stats] = await Promise.all([
    DistributionService.listCenters(organizationId),
    DistributionService.listChannels(organizationId),
    DistributionService.listFulfillments(organizationId),
    DistributionService.listNetworks(organizationId),
    DistributionService.getDistributionMetrics(organizationId),
    DistributionService.getDistributionStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Warehouse className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Distribution</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage distribution centers, channels, fulfillment orders, and networks.</p>
      </div>

      <DistributionDashboard
        organizationId={organizationId}
        centers={centers}
        channels={channels}
        fulfillments={fulfillments}
        networks={networks}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
