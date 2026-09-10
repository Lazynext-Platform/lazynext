import type { Metadata } from 'next';
import { Droplets } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Water Management — Lazynext',
  description: 'Manage water meters, consumption readings, quality tests, and conservation programs.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WaterManagementService } from '@/lib/services/water-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { WaterManagementDashboard } from './WaterManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function WaterManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Water Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage water meters, consumption readings, quality tests, and conservation programs.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Droplets}
            title="No workspace yet"
            description="Create a company first to access water management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [meters, readings, qualityTests, programs, metrics, stats] = await Promise.all([
    WaterManagementService.listWaterMeters(organizationId),
    WaterManagementService.listWaterReadings(organizationId),
    WaterManagementService.listWaterQualityTests(organizationId),
    WaterManagementService.listConservationPrograms(organizationId),
    WaterManagementService.getWaterManagementMetrics(organizationId),
    WaterManagementService.getWaterManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Droplets className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Water Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage water meters, consumption readings, quality tests, and conservation programs.</p>
      </div>

      <WaterManagementDashboard
        organizationId={organizationId}
        meters={meters}
        readings={readings}
        qualityTests={qualityTests}
        programs={programs}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
