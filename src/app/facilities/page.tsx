import type { Metadata } from 'next';
import { Building } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Facilities & Real Estate — Lazynext',
  description: 'Manage buildings, leases, maintenance requests, and space allocations.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FacilitiesService } from '@/lib/services/facilities-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { FacilitiesDashboard } from './FacilitiesDashboard';

export const dynamic = 'force-dynamic';

export default async function FacilitiesPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Facilities & Real Estate</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage buildings, leases, maintenance requests, and space allocations.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Building}
            title="No workspace yet"
            description="Create a company first to access facilities management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [facilities, leases, maintenance, spaces, occupancy, costs, stats] = await Promise.all([
    FacilitiesService.listFacilities(organizationId),
    FacilitiesService.listLeases(organizationId),
    FacilitiesService.listMaintenanceRequests(organizationId),
    FacilitiesService.getSpaceAllocations(organizationId),
    FacilitiesService.getOccupancyReport(organizationId),
    FacilitiesService.getFacilityCosts(organizationId),
    FacilitiesService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Building className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Facilities & Real Estate</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage buildings, leases, maintenance requests, and space allocations.</p>
      </div>

      <FacilitiesDashboard
        organizationId={organizationId}
        facilities={facilities}
        leases={leases}
        maintenance={maintenance}
        spaces={spaces}
        occupancy={occupancy}
        costs={costs}
        stats={stats}
      />
    </div>
  );
}
