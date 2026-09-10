import type { Metadata } from 'next';
import { Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Transportation Management — Lazynext',
  description: 'Manage fleet vehicles, transport routes, driver assignments, and trips.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TransportationManagementService } from '@/lib/services/transportation-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { TransportationManagementDashboard } from './TransportationManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function TransportationManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Transportation Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage fleet vehicles, transport routes, driver assignments, and trips.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Truck}
            title="No workspace yet"
            description="Create a company first to access transportation management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [vehicles, routes, assignments, trips, metrics, stats] = await Promise.all([
    TransportationManagementService.listVehicles(organizationId),
    TransportationManagementService.listRoutes(organizationId),
    TransportationManagementService.listAssignments(organizationId),
    TransportationManagementService.listTrips(organizationId),
    TransportationManagementService.getTransportationManagementMetrics(organizationId),
    TransportationManagementService.getTransportationManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Transportation Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage fleet vehicles, transport routes, driver assignments, and trips.</p>
      </div>

      <TransportationManagementDashboard
        organizationId={organizationId}
        vehicles={vehicles}
        routes={routes}
        assignments={assignments}
        trips={trips}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
