import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Environmental Compliance — Lazynext',
  description: 'Manage environmental permits, emissions records, waste tracking, and compliance reports.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EnvironmentalComplianceService } from '@/lib/services/environmental-compliance-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { EnvironmentalComplianceDashboard } from './EnvironmentalComplianceDashboard';

export const dynamic = 'force-dynamic';

export default async function EnvironmentalCompliancePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Environmental Compliance</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage environmental permits, emissions records, waste tracking, and compliance reports.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={ShieldCheck}
            title="No workspace yet"
            description="Create a company first to access environmental compliance."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [permits, emissions, wastes, reports, metrics, stats] = await Promise.all([
    EnvironmentalComplianceService.listPermits(organizationId),
    EnvironmentalComplianceService.listEmissions(organizationId),
    EnvironmentalComplianceService.listWastes(organizationId),
    EnvironmentalComplianceService.listReports(organizationId),
    EnvironmentalComplianceService.getEnvironmentalComplianceMetrics(organizationId),
    EnvironmentalComplianceService.getEnvironmentalComplianceStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Environmental Compliance</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage environmental permits, emissions records, waste tracking, and compliance reports.</p>
      </div>

      <EnvironmentalComplianceDashboard
        organizationId={organizationId}
        permits={permits}
        emissions={emissions}
        wastes={wastes}
        reports={reports}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
