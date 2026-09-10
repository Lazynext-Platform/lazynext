import type { Metadata } from 'next';
import { Home } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Corporate Housing — Lazynext',
  description: 'Manage corporate apartments, bookings, maintenance, and tenants.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateHousingService } from '@/lib/services/corporate-housing-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { CorporateHousingDashboard } from './CorporateHousingDashboard';

export const dynamic = 'force-dynamic';

export default async function CorporateHousingPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Corporate Housing</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage corporate apartments, bookings, maintenance, and tenants.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Home}
            title="No workspace yet"
            description="Create a company first to access corporate housing."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [properties, bookings, maintenance, tenants, metrics, stats] = await Promise.all([
    CorporateHousingService.listProperties(organizationId),
    CorporateHousingService.listBookings(organizationId),
    CorporateHousingService.listMaintenance(organizationId),
    CorporateHousingService.listTenants(organizationId),
    CorporateHousingService.getCorporateHousingMetrics(organizationId),
    CorporateHousingService.getCorporateHousingStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Home className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Corporate Housing</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage corporate apartments, bookings, maintenance, and tenants.</p>
      </div>

      <CorporateHousingDashboard
        organizationId={organizationId}
        properties={properties}
        bookings={bookings}
        maintenance={maintenance}
        tenants={tenants}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
