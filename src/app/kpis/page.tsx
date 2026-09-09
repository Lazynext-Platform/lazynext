import type { Metadata } from 'next';
import { Target } from 'lucide-react';

export const metadata: Metadata = {
  title: 'KPI Management — Lazynext',
  description: 'Manage KPI definitions, targets, measurements, and dashboards.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KpiService } from '@/lib/services/kpi-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { KpiDashboard } from './KpiDashboard';

export const dynamic = 'force-dynamic';

export default async function KpisPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">KPI Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage KPI definitions, targets, measurements, and dashboards.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Target}
            title="No workspace yet"
            description="Create a company first to access KPI management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [definitions, targets, measurements, dashboards, metrics, stats] = await Promise.all([
    KpiService.listKpiDefinitions(organizationId),
    KpiService.listKpiTargets(organizationId),
    KpiService.listKpiMeasurements(organizationId),
    KpiService.listKpiDashboards(organizationId),
    KpiService.getKpiMetrics(organizationId),
    KpiService.getKpiStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">KPI Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage KPI definitions, targets, measurements, and dashboards.</p>
      </div>

      <KpiDashboard
        organizationId={organizationId}
        definitions={definitions}
        targets={targets}
        measurements={measurements}
        dashboards={dashboards}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
