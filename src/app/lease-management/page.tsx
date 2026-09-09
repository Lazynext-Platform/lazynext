import type { Metadata } from 'next';
import { Building } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Lease Management — Lazynext',
  description: 'Manage lease properties, contracts, tenants, and payments.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LeaseManagementService } from '@/lib/services/lease-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { LeaseManagementDashboard } from './LeaseManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function LeaseManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Lease Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage lease properties, contracts, tenants, and payments.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Building}
            title="No workspace yet"
            description="Create a company first to access lease management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [properties, contracts, tenants, payments, metrics, stats] = await Promise.all([
    LeaseManagementService.listProperties(organizationId),
    LeaseManagementService.listContracts(organizationId),
    LeaseManagementService.listTenants(organizationId),
    LeaseManagementService.listPayments(organizationId),
    LeaseManagementService.getLeaseManagementMetrics(organizationId),
    LeaseManagementService.getLeaseManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Building className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Lease Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage lease properties, contracts, tenants, and payments.</p>
      </div>

      <LeaseManagementDashboard
        organizationId={organizationId}
        properties={properties}
        contracts={contracts}
        tenants={tenants}
        payments={payments}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
