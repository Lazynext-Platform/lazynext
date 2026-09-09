import type { Metadata } from 'next';
import { Wrench } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Field Service — Lazynext',
  description: 'Manage service orders, technicians, assignments, and equipment.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FieldServiceService } from '@/lib/services/field-service-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { FieldServiceDashboard } from './FieldServiceDashboard';

export const dynamic = 'force-dynamic';

export default async function FieldServicePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Field Service</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage service orders, technicians, assignments, and equipment.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Wrench}
            title="No workspace yet"
            description="Create a company first to access field service management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [orders, technicians, assignments, equipment, metrics, stats] = await Promise.all([
    FieldServiceService.listOrders(organizationId),
    FieldServiceService.listTechnicians(organizationId),
    FieldServiceService.listAssignments(organizationId),
    FieldServiceService.listEquipment(organizationId),
    FieldServiceService.getFieldServiceMetrics(organizationId),
    FieldServiceService.getFieldServiceStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Wrench className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Field Service</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage service orders, technicians, assignments, and equipment.</p>
      </div>

      <FieldServiceDashboard
        organizationId={organizationId}
        orders={orders}
        technicians={technicians}
        assignments={assignments}
        equipment={equipment}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
