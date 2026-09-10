import type { Metadata } from 'next';
import { Award } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Grants — Lazynext',
  description: 'Manage grant opportunities, applications, awards, reports, and disbursements.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GrantService } from '@/lib/services/grant-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { GrantDashboard } from './GrantDashboard';

export const dynamic = 'force-dynamic';

export default async function GrantsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Grants</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage grant opportunities, applications, awards, reports, and disbursements.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Award}
            title="No workspace yet"
            description="Create a company first to access grant management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [opportunities, applications, awards, reports, disbursements, metrics, stats] = await Promise.all([
    GrantService.listOpportunities(organizationId),
    GrantService.listApplications(organizationId),
    GrantService.listAwards(organizationId),
    GrantService.listReports(organizationId),
    GrantService.listDisbursements(organizationId),
    GrantService.getGrantMetrics(organizationId),
    GrantService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Award className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Grants</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage grant opportunities, applications, awards, reports, and disbursements.</p>
      </div>

      <GrantDashboard
        organizationId={organizationId}
        opportunities={opportunities}
        applications={applications}
        awards={awards}
        reports={reports}
        disbursements={disbursements}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
