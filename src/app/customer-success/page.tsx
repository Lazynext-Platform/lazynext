import type { Metadata } from 'next';
import { Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Customer Success — Lazynext',
  description: 'Manage health scores, success plans, churn risk, expansions, renewals, and touchpoints.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { CustomerSuccessDashboard } from './CustomerSuccessDashboard';

export const dynamic = 'force-dynamic';

export default async function CustomerSuccessPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Customer Success</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage health scores, success plans, churn risk, expansions, renewals, and touchpoints.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Heart}
            title="No workspace yet"
            description="Create a company first to access customer success."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [healthScores, successPlans, churnRisks, expansions, renewals, touchpoints, metrics, stats] = await Promise.all([
    CustomerSuccessService.listHealthScores(organizationId),
    CustomerSuccessService.listSuccessPlans(organizationId),
    CustomerSuccessService.listChurnRisks(organizationId),
    CustomerSuccessService.listExpansions(organizationId),
    CustomerSuccessService.listRenewals(organizationId),
    CustomerSuccessService.listTouchpoints(organizationId),
    CustomerSuccessService.getCSMetrics(organizationId),
    CustomerSuccessService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Customer Success</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage health scores, success plans, churn risk, expansions, renewals, and touchpoints.</p>
      </div>

      <CustomerSuccessDashboard
        organizationId={organizationId}
        healthScores={healthScores}
        successPlans={successPlans}
        churnRisks={churnRisks}
        expansions={expansions}
        renewals={renewals}
        touchpoints={touchpoints}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
