import type { Metadata } from 'next';
import { Factory } from 'lucide-react';

export const metadata: Metadata = {
  title: 'GHG Emissions Management — Lazynext',
  description: 'Manage greenhouse gas emissions, emission factors, GHG reports, and emission sources.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GHGEmissionsManagementService } from '@/lib/services/ghg-emissions-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { GHGEmissionsManagementDashboard } from './GHGEmissionsManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function GHGEmissionsManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">GHG Emissions Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage greenhouse gas emissions, emission factors, GHG reports, and emission sources.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Factory}
            title="No workspace yet"
            description="Create a company first to access GHG emissions management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [emissions, factors, reports, sources, metrics, stats] = await Promise.all([
    GHGEmissionsManagementService.listGHGEmissions(organizationId),
    GHGEmissionsManagementService.listEmissionFactors(organizationId),
    GHGEmissionsManagementService.listGHGReports(organizationId),
    GHGEmissionsManagementService.listEmissionSources(organizationId),
    GHGEmissionsManagementService.getGHGEmissionsManagementMetrics(organizationId),
    GHGEmissionsManagementService.getGHGEmissionsManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Factory className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">GHG Emissions Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage greenhouse gas emissions, emission factors, GHG reports, and emission sources.</p>
      </div>

      <GHGEmissionsManagementDashboard
        organizationId={organizationId}
        emissions={emissions}
        factors={factors}
        reports={reports}
        sources={sources}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
