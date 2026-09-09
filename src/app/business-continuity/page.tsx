import type { Metadata } from 'next';
import { Activity } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Business Continuity Management — Lazynext',
  description: 'Manage continuity plans, recovery strategies, business impact analyses, and continuity tests.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BusinessContinuityService } from '@/lib/services/business-continuity-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { BusinessContinuityDashboard } from './BusinessContinuityDashboard';

export const dynamic = 'force-dynamic';

export default async function BusinessContinuityPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Business Continuity</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage continuity plans, recovery strategies, business impact analyses, and continuity tests.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Activity}
            title="No workspace yet"
            description="Create a company first to access business continuity."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [plans, strategies, bias, tests, metrics, stats] = await Promise.all([
    BusinessContinuityService.listContinuityPlans(organizationId),
    BusinessContinuityService.listRecoveryStrategies(organizationId),
    BusinessContinuityService.listBusinessImpactAnalyses(organizationId),
    BusinessContinuityService.listContinuityTests(organizationId),
    BusinessContinuityService.getBusinessContinuityMetrics(organizationId),
    BusinessContinuityService.getBusinessContinuityStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Business Continuity</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage continuity plans, recovery strategies, business impact analyses, and continuity tests.</p>
      </div>

      <BusinessContinuityDashboard
        organizationId={organizationId}
        plans={plans}
        strategies={strategies}
        bias={bias}
        tests={tests}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
