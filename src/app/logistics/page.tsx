import type { Metadata } from 'next';
import { Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Logistics — Lazynext',
  description: 'Manage shipments, carriers, routes, and freight records.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LogisticsService } from '@/lib/services/logistics-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { LogisticsDashboard } from './LogisticsDashboard';

export const dynamic = 'force-dynamic';

export default async function LogisticsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Logistics</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage shipments, carriers, routes, and freight records.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Truck}
            title="No workspace yet"
            description="Create a company first to access logistics management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [shipments, carriers, routes, freights, metrics, stats] = await Promise.all([
    LogisticsService.listShipments(organizationId),
    LogisticsService.listCarriers(organizationId),
    LogisticsService.listRoutes(organizationId),
    LogisticsService.listFreights(organizationId),
    LogisticsService.getLogisticsMetrics(organizationId),
    LogisticsService.getLogisticsStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Logistics</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage shipments, carriers, routes, and freight records.</p>
      </div>

      <LogisticsDashboard
        organizationId={organizationId}
        shipments={shipments}
        carriers={carriers}
        routes={routes}
        freights={freights}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
