import type { Metadata } from 'next';
import { Lightbulb } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Innovation — Lazynext',
  description: 'Manage ideas, projects, patents, innovation metrics, and challenges.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InnovationService } from '@/lib/services/innovation-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { InnovationDashboard } from './InnovationDashboard';

export const dynamic = 'force-dynamic';

export default async function InnovationPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Innovation</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage ideas, projects, patents, innovation metrics, and challenges.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Lightbulb}
            title="No workspace yet"
            description="Create a company first to access innovation management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [ideas, projects, patents, metrics, challenges, metricsSummary, stats] = await Promise.all([
    InnovationService.listIdeas(organizationId),
    InnovationService.listProjects(organizationId),
    InnovationService.listPatents(organizationId),
    InnovationService.listMetrics(organizationId),
    InnovationService.listChallenges(organizationId),
    InnovationService.getInnovationMetrics(organizationId),
    InnovationService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Innovation</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage ideas, projects, patents, innovation metrics, and challenges.</p>
      </div>

      <InnovationDashboard
        organizationId={organizationId}
        ideas={ideas}
        projects={projects}
        patents={patents}
        metrics={metrics}
        challenges={challenges}
        metricsSummary={metricsSummary}
        stats={stats}
      />
    </div>
  );
}
