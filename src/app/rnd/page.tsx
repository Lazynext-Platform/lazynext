import type { Metadata } from 'next';
import { FlaskConical } from 'lucide-react';

export const metadata: Metadata = {
  title: 'R&D — Lazynext',
  description: 'Manage research projects, experiments, patents, and innovation pipelines.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RndService } from '@/lib/services/rnd-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { RndDashboard } from './RndDashboard';

export const dynamic = 'force-dynamic';

export default async function RndPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">R&amp;D</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage research projects, experiments, patents, and innovation pipelines.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={FlaskConical}
            title="No workspace yet"
            description="Create a company first to access R&D management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [projects, experiments, patents, innovations, metrics, stats] = await Promise.all([
    RndService.listProjects(organizationId),
    RndService.listExperiments(organizationId),
    RndService.listPatents(organizationId),
    RndService.listInnovations(organizationId),
    RndService.getRndMetrics(organizationId),
    RndService.getRndStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">R&amp;D</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage research projects, experiments, patents, and innovation pipelines.</p>
      </div>

      <RndDashboard
        organizationId={organizationId}
        projects={projects}
        experiments={experiments}
        patents={patents}
        innovations={innovations}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
