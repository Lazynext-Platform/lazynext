import type { Metadata } from 'next';
import { CircleParking } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Parking Management — Lazynext',
  description: 'Manage parking spots, permits, allocations, and visitor parking.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ParkingManagementService } from '@/lib/services/parking-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { ParkingManagementDashboard } from './ParkingManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function ParkingManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Parking Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage parking spots, permits, allocations, and visitor parking.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={CircleParking}
            title="No workspace yet"
            description="Create a company first to access parking management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [spots, permits, allocations, visitorParking, metrics, stats] = await Promise.all([
    ParkingManagementService.listSpots(organizationId),
    ParkingManagementService.listPermits(organizationId),
    ParkingManagementService.listAllocations(organizationId),
    ParkingManagementService.listVisitorParking(organizationId),
    ParkingManagementService.getParkingManagementMetrics(organizationId),
    ParkingManagementService.getParkingManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <CircleParking className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Parking Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage parking spots, permits, allocations, and visitor parking.</p>
      </div>

      <ParkingManagementDashboard
        organizationId={organizationId}
        spots={spots}
        permits={permits}
        allocations={allocations}
        visitorParking={visitorParking}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
