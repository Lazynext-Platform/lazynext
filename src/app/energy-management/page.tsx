import type { Metadata } from 'next';
import { Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Energy Management — Lazynext',
  description: 'Manage energy meters, consumption readings, efficiency targets, and tariffs.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EnergyManagementService } from '@/lib/services/energy-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { EnergyManagementDashboard } from './EnergyManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function EnergyManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Energy Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage energy meters, consumption readings, efficiency targets, and tariffs.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Zap}
            title="No workspace yet"
            description="Create a company first to access energy management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [meters, readings, targets, tariffs, metrics, stats] = await Promise.all([
    EnergyManagementService.listEnergyMeters(organizationId),
    EnergyManagementService.listEnergyReadings(organizationId),
    EnergyManagementService.listEfficiencyTargets(organizationId),
    EnergyManagementService.listEnergyTariffs(organizationId),
    EnergyManagementService.getEnergyManagementMetrics(organizationId),
    EnergyManagementService.getEnergyManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Energy Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage energy meters, consumption readings, efficiency targets, and tariffs.</p>
      </div>

      <EnergyManagementDashboard
        organizationId={organizationId}
        meters={meters}
        readings={readings}
        targets={targets}
        tariffs={tariffs}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
