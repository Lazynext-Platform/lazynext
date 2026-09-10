import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hazard Management — Lazynext',
  description: 'Manage hazards, risk assessments, control measures, and job safety analyses.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { HazardManagementService } from '@/lib/services/hazard-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { HazardManagementDashboard } from './HazardManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function HazardManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Hazard Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage hazards, risk assessments, control measures, and job safety analyses.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={ShieldAlert}
            title="No workspace yet"
            description="Create a company first to access hazard management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [hazards, assessments, controls, jsas, metrics, stats] = await Promise.all([
    HazardManagementService.listHazards(organizationId),
    HazardManagementService.listRiskAssessments(organizationId),
    HazardManagementService.listControlMeasures(organizationId),
    HazardManagementService.listJobSafetyAnalyses(organizationId),
    HazardManagementService.getHazardManagementMetrics(organizationId),
    HazardManagementService.getHazardManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Hazard Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage hazards, risk assessments, control measures, and job safety analyses.</p>
      </div>

      <HazardManagementDashboard
        organizationId={organizationId}
        hazards={hazards}
        assessments={assessments}
        controls={controls}
        jsas={jsas}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
