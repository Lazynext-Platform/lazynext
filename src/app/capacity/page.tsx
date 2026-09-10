import type { Metadata } from 'next';
import { Gauge } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Capacity Planning — Lazynext',
  description: 'Resource allocation, utilization, and workload forecasting.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CapacityService } from '@/lib/services/capacity-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { CapacityDashboard } from './CapacityDashboard';

export const dynamic = 'force-dynamic';

export default async function CapacityPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Capacity Planning</h1>
          <p className="text-sm text-fg-secondary mt-1">Resource allocation, utilization, and workload forecasting.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Gauge}
            title="No workspace yet"
            description="Create a company first to start planning capacity."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const [allocations, teamUtilization, overallocated, underutilized, workloadByProject, bottlenecks, forecast, stats] = await Promise.all([
    CapacityService.list(organizationId),
    CapacityService.getTeamUtilization(organizationId),
    CapacityService.getOverallocatedUsers(organizationId),
    CapacityService.getUnderutilizedUsers(organizationId),
    CapacityService.getWorkloadByProject(organizationId),
    CapacityService.getBottlenecks(organizationId),
    CapacityService.getForecast(organizationId, 4),
    CapacityService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Gauge className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Capacity Planning</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Resource allocation, utilization, and workload forecasting.</p>
      </div>

      <CapacityDashboard
        organizationId={organizationId}
        allocations={allocations}
        teamUtilization={teamUtilization}
        overallocated={overallocated}
        underutilized={underutilized}
        workloadByProject={workloadByProject}
        bottlenecks={bottlenecks}
        forecast={forecast}
        stats={stats}
      />
    </div>
  );
}
