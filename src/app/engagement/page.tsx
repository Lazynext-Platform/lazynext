import type { Metadata } from 'next';
import { ClipboardList } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Employee Engagement — Lazynext',
  description: 'Manage employee engagement surveys, questions, responses, and action plans.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EngagementService } from '@/lib/services/engagement-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { EngagementDashboard } from './EngagementDashboard';

export const dynamic = 'force-dynamic';

export default async function EngagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Employee Engagement</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage employee engagement surveys, questions, responses, and action plans.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={ClipboardList}
            title="No workspace yet"
            description="Create a company first to access employee engagement management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [surveys, questions, responses, actions, metrics, stats] = await Promise.all([
    EngagementService.listSurveys(organizationId),
    EngagementService.listQuestions(organizationId),
    EngagementService.listResponses(organizationId),
    EngagementService.listActions(organizationId),
    EngagementService.getEngagementMetrics(organizationId),
    EngagementService.getEngagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Employee Engagement</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage employee engagement surveys, questions, responses, and action plans.</p>
      </div>

      <EngagementDashboard
        organizationId={organizationId}
        surveys={surveys}
        questions={questions}
        responses={responses}
        actions={actions}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
