import type { Metadata } from 'next';
import { Network } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Job Architecture — Lazynext',
  description: 'Manage job families, levels, roles, and career paths.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { JobArchitectureService } from '@/lib/services/job-architecture-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { JobArchitectureDashboard } from './JobArchitectureDashboard';

export const dynamic = 'force-dynamic';

export default async function JobArchitecturePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Job Architecture</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage job families, levels, roles, and career paths.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Network}
            title="No workspace yet"
            description="Create a company first to access job architecture management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [families, levels, roles, paths, metrics, stats] = await Promise.all([
    JobArchitectureService.listFamilies(organizationId),
    JobArchitectureService.listLevels(organizationId),
    JobArchitectureService.listRoles(organizationId),
    JobArchitectureService.listPaths(organizationId),
    JobArchitectureService.getJobArchitectureMetrics(organizationId),
    JobArchitectureService.getJobArchitectureStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Network className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Job Architecture</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage job families, levels, roles, and career paths.</p>
      </div>

      <JobArchitectureDashboard
        organizationId={organizationId}
        families={families}
        levels={levels}
        roles={roles}
        paths={paths}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
