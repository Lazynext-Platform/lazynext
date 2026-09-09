import type { Metadata } from 'next';
import { FileBarChart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sustainability Reporting — Lazynext',
  description: 'Manage sustainability reports, reporting frameworks, disclosures, and assurance engagements.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SustainabilityReportingService } from '@/lib/services/sustainability-reporting-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { SustainabilityReportingDashboard } from './SustainabilityReportingDashboard';

export const dynamic = 'force-dynamic';

export default async function SustainabilityReportingPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Sustainability Reporting</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage sustainability reports, reporting frameworks, disclosures, and assurance engagements.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={FileBarChart}
            title="No workspace yet"
            description="Create a company first to access sustainability reporting."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [reports, frameworks, disclosures, assurances, metrics, stats] = await Promise.all([
    SustainabilityReportingService.listSustainabilityReports(organizationId),
    SustainabilityReportingService.listReportingFrameworks(organizationId),
    SustainabilityReportingService.listSustainabilityDisclosures(organizationId),
    SustainabilityReportingService.listAssuranceEngagements(organizationId),
    SustainabilityReportingService.getSustainabilityReportingMetrics(organizationId),
    SustainabilityReportingService.getSustainabilityReportingStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <FileBarChart className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Sustainability Reporting</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage sustainability reports, reporting frameworks, disclosures, and assurance engagements.</p>
      </div>

      <SustainabilityReportingDashboard
        organizationId={organizationId}
        reports={reports}
        frameworks={frameworks}
        disclosures={disclosures}
        assurances={assurances}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
