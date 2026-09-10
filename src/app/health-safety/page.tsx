import type { Metadata } from 'next';
import { HardHat } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Health & Safety — Lazynext',
  description: 'Manage incidents, inspections, training, hazards, and safety observations.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { HealthSafetyService } from '@/lib/services/health-safety-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { HealthSafetyDashboard } from './HealthSafetyDashboard';

export const dynamic = 'force-dynamic';

export default async function HealthSafetyPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Health & Safety</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage incidents, inspections, training, hazards, and safety observations.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={HardHat}
            title="No workspace yet"
            description="Create a company first to access health & safety."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [incidents, inspections, trainings, hazards, observations, metrics, stats] = await Promise.all([
    HealthSafetyService.listIncidents(organizationId),
    HealthSafetyService.listInspections(organizationId),
    HealthSafetyService.listTrainings(organizationId),
    HealthSafetyService.listHazards(organizationId),
    HealthSafetyService.listObservations(organizationId),
    HealthSafetyService.getSafetyMetrics(organizationId),
    HealthSafetyService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <HardHat className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Health & Safety</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage incidents, inspections, training, hazards, and safety observations.</p>
      </div>

      <HealthSafetyDashboard
        organizationId={organizationId}
        incidents={incidents}
        inspections={inspections}
        trainings={trainings}
        hazards={hazards}
        observations={observations}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
