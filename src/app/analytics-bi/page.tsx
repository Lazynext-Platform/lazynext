import type { Metadata } from 'next';
import { BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Advanced Analytics & BI — Lazynext',
  description: 'Custom dashboards, reports, KPIs, trend analysis, and predictive forecasting.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AnalyticsService } from '@/lib/services/analytics-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export const dynamic = 'force-dynamic';

export default async function AnalyticsBIPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Advanced Analytics & BI</h1>
          <p className="text-sm text-fg-secondary mt-1">
            Custom dashboards, reports, KPIs, trend analysis, and predictive forecasting.
          </p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={BarChart3}
            title="No workspace yet"
            description="Create a company first to access analytics."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [kpis, dashboards, reports, stats] = await Promise.all([
    AnalyticsService.getKPIs(organizationId),
    AnalyticsService.listDashboards(organizationId),
    AnalyticsService.listReports(organizationId),
    AnalyticsService.getDashboardStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Advanced Analytics & BI</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">
          Custom dashboards, reports, KPIs, trend analysis, and predictive forecasting.
        </p>
      </div>

      <AnalyticsDashboard
        organizationId={organizationId}
        kpis={kpis}
        dashboards={dashboards}
        reports={reports}
        stats={stats}
      />
    </div>
  );
}
