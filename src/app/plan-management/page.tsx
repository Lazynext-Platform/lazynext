import type { Metadata } from 'next';
import { Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Plan Management — Lazynext',
  description: 'Manage benefit plans, enrollments, providers, and claims.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PlanManagementService } from '@/lib/services/plan-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { PlanManagementDashboard } from './PlanManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function PlanManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Plan Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage benefit plans, enrollments, providers, and claims.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Heart}
            title="No workspace yet"
            description="Create a company first to access plan management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [plans, enrollments, providers, claims, metrics, stats] = await Promise.all([
    PlanManagementService.listPlans(organizationId),
    PlanManagementService.listEnrollments(organizationId),
    PlanManagementService.listProviders(organizationId),
    PlanManagementService.listClaims(organizationId),
    PlanManagementService.getPlanManagementMetrics(organizationId),
    PlanManagementService.getPlanManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Plan Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage benefit plans, enrollments, providers, and claims.</p>
      </div>

      <PlanManagementDashboard
        organizationId={organizationId}
        plans={plans}
        enrollments={enrollments}
        providers={providers}
        claims={claims}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
