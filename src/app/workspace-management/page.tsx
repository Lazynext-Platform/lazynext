import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Workspace Management — Lazynext',
  description: 'Manage desk bookings, meeting rooms, office layouts, and reservations.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WorkspaceManagementService } from '@/lib/services/workspace-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { WorkspaceManagementDashboard } from './WorkspaceManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function WorkspaceManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Workspace Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage desk bookings, meeting rooms, office layouts, and reservations.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Building2}
            title="No workspace yet"
            description="Create a company first to access workspace management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [desks, rooms, layouts, bookings, metrics, stats] = await Promise.all([
    WorkspaceManagementService.listDesks(organizationId),
    WorkspaceManagementService.listRooms(organizationId),
    WorkspaceManagementService.listLayouts(organizationId),
    WorkspaceManagementService.listBookings(organizationId),
    WorkspaceManagementService.getWorkspaceManagementMetrics(organizationId),
    WorkspaceManagementService.getWorkspaceManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Workspace Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage desk bookings, meeting rooms, office layouts, and reservations.</p>
      </div>

      <WorkspaceManagementDashboard
        organizationId={organizationId}
        desks={desks}
        rooms={rooms}
        layouts={layouts}
        bookings={bookings}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
