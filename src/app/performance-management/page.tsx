import type { Metadata } from 'next';
import { ClipboardCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Performance Management — Lazynext',
  description: 'Manage performance reviews, goals, feedback, and development plans.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PerformanceManagementService } from '@/lib/services/performance-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { PerformanceManagementDashboard } from './PerformanceManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function PerformanceManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Performance Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage performance reviews, goals, feedback, and development plans.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={ClipboardCheck}
            title="No workspace yet"
            description="Create a company first to access performance management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [reviews, goals, feedback, plans, metrics, stats] = await Promise.all([
    PerformanceManagementService.listReviews(organizationId),
    PerformanceManagementService.listGoals(organizationId),
    PerformanceManagementService.listFeedback(organizationId),
    PerformanceManagementService.listPlans(organizationId),
    PerformanceManagementService.getPerformanceManagementMetrics(organizationId),
    PerformanceManagementService.getPerformanceManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Performance Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage performance reviews, goals, feedback, and development plans.</p>
      </div>

      <PerformanceManagementDashboard
        organizationId={organizationId}
        reviews={reviews}
        goals={goals}
        feedback={feedback}
        plans={plans}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
