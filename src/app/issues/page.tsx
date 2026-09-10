import type { Metadata } from 'next';
import { Bug } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Issue & Sprint Tracking — Lazynext',
  description: 'Track issues, manage sprints, and monitor burndown and velocity.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IssueService } from '@/lib/services/issue-service';
import { SprintService } from '@/lib/services/sprint-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { IssueTracker } from './IssueTracker';

export const dynamic = 'force-dynamic';

export default async function IssuesPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Issue &amp; Sprint Tracking</h1>
          <p className="text-sm text-fg-secondary mt-1">Track issues, manage sprints, and monitor burndown and velocity.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Bug}
            title="No workspace yet"
            description="Create a company first to access issue tracking."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const currentUserId = session.user.id;

  const [issues, backlog, kanban, issueStats, sprints, activeSprints, upcomingSprints, sprintStats, velocity] = await Promise.all([
    IssueService.list(organizationId),
    IssueService.getBacklog(organizationId),
    IssueService.getByStatus(organizationId),
    IssueService.getStats(organizationId),
    SprintService.list(organizationId),
    SprintService.getActive(organizationId),
    SprintService.getUpcoming(organizationId),
    SprintService.getStats(organizationId),
    SprintService.getVelocity(organizationId),
  ]);

  // Fetch burndown for the first active sprint (if any)
  const burndown = activeSprints.length > 0
    ? await SprintService.getBurndown(activeSprints[0].id)
    : { ideal: [], actual: [], totalPoints: 0, daysRemaining: 0 };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Bug className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Issue &amp; Sprint Tracking</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Track issues, manage sprints, and monitor burndown and velocity.</p>
      </div>

      <IssueTracker
        organizationId={organizationId}
        currentUserId={currentUserId}
        initialIssues={issues}
        initialBacklog={backlog}
        initialKanban={kanban}
        initialIssueStats={issueStats}
        initialSprints={sprints}
        initialActiveSprints={activeSprints}
        initialUpcomingSprints={upcomingSprints}
        initialSprintStats={sprintStats}
        initialVelocity={velocity}
        initialBurndown={burndown}
      />
    </div>
  );
}
