import type { Metadata } from 'next';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Estate Planning — Lazynext',
  description: 'Manage trusts, wills, beneficiaries, and executors for estate planning.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EstatePlanningService } from '@/lib/services/estate-planning-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { EstatePlanningDashboard } from './EstatePlanningDashboard';

export const dynamic = 'force-dynamic';

export default async function EstatePlanningPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Estate Planning</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage trusts, wills, beneficiaries, and executors for estate planning.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Shield}
            title="No workspace yet"
            description="Create a company first to access estate planning management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [trusts, wills, beneficiaries, executors, metrics, stats] = await Promise.all([
    EstatePlanningService.listTrusts(organizationId),
    EstatePlanningService.listWills(organizationId),
    EstatePlanningService.listBeneficiaries(organizationId),
    EstatePlanningService.listExecutors(organizationId),
    EstatePlanningService.getEstatePlanningMetrics(organizationId),
    EstatePlanningService.getEstatePlanningStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Estate Planning</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage trusts, wills, beneficiaries, and executors for estate planning.</p>
      </div>

      <EstatePlanningDashboard
        organizationId={organizationId}
        trusts={trusts}
        wills={wills}
        beneficiaries={beneficiaries}
        executors={executors}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
