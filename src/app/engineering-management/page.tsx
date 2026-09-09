import type { Metadata } from 'next';
import { Code } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Engineering Management — Lazynext',
  description: 'Track engineering metrics, sprint reports, code quality, and team health.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EngineeringManagementService } from '@/lib/services/engineering-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { EngineeringManagementDashboard } from './EngineeringManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function EngineeringManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Engineering Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Track engineering metrics, sprint reports, code quality, and team health.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Code}
            title="No workspace yet"
            description="Create a company first to access engineering management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [metrics, sprints, qualities, healths, metricsSummary, stats] = await Promise.all([
    EngineeringManagementService.listMetrics(organizationId),
    EngineeringManagementService.listSprints(organizationId),
    EngineeringManagementService.listQualities(organizationId),
    EngineeringManagementService.listHealths(organizationId),
    EngineeringManagementService.getEngineeringMetrics(organizationId),
    EngineeringManagementService.getEngineeringStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Code className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Engineering Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Track engineering metrics, sprint reports, code quality, and team health.</p>
      </div>

      <EngineeringManagementDashboard
        organizationId={organizationId}
        metrics={metrics}
        sprints={sprints}
        qualities={qualities}
        healths={healths}
        metricsSummary={metricsSummary}
        stats={stats}
      />
    </div>
  );
}
