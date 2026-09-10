import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Safety Incident Management — Lazynext',
  description: 'Manage safety incidents, investigations, root cause analyses, and corrective actions.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SafetyIncidentService } from '@/lib/services/safety-incident-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { SafetyIncidentDashboard } from './SafetyIncidentDashboard';

export const dynamic = 'force-dynamic';

export default async function SafetyIncidentPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Safety Incident Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage safety incidents, investigations, root cause analyses, and corrective actions.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={AlertTriangle}
            title="No workspace yet"
            description="Create a company first to access safety incident management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [incidents, investigations, rcas, correctiveActions, metrics, stats] = await Promise.all([
    SafetyIncidentService.listSafetyIncidents(organizationId),
    SafetyIncidentService.listIncidentInvestigations(organizationId),
    SafetyIncidentService.listRootCauseAnalyses(organizationId),
    SafetyIncidentService.listCorrectiveActions(organizationId),
    SafetyIncidentService.getSafetyIncidentMetrics(organizationId),
    SafetyIncidentService.getSafetyIncidentStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Safety Incident Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage safety incidents, investigations, root cause analyses, and corrective actions.</p>
      </div>

      <SafetyIncidentDashboard
        organizationId={organizationId}
        incidents={incidents}
        investigations={investigations}
        rcas={rcas}
        correctiveActions={correctiveActions}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
