import type { Metadata } from 'next';
import { Leaf } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sustainability / ESG — Lazynext',
  description: 'Manage ESG metrics, targets, initiatives, reports, carbon emissions, and assessments.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SustainabilityService } from '@/lib/services/sustainability-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { SustainabilityDashboard } from './SustainabilityDashboard';

export const dynamic = 'force-dynamic';

export default async function SustainabilityPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Sustainability / ESG</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage ESG metrics, targets, initiatives, reports, carbon emissions, and assessments.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Leaf}
            title="No workspace yet"
            description="Create a company first to access sustainability management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [metrics, targets, initiatives, reports, carbonEmissions, assessments, stats, carbonFootprint, esgScore] = await Promise.all([
    SustainabilityService.listMetrics(organizationId),
    SustainabilityService.listTargets(organizationId),
    SustainabilityService.listInitiatives(organizationId),
    SustainabilityService.listReports(organizationId),
    SustainabilityService.listCarbonEmissions(organizationId),
    SustainabilityService.listAssessments(organizationId),
    SustainabilityService.getStats(organizationId),
    SustainabilityService.getCarbonFootprint(organizationId),
    SustainabilityService.getESGScore(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Sustainability / ESG</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage ESG metrics, targets, initiatives, reports, carbon emissions, and assessments.</p>
      </div>

      <SustainabilityDashboard
        organizationId={organizationId}
        metrics={metrics}
        targets={targets}
        initiatives={initiatives}
        reports={reports}
        carbonEmissions={carbonEmissions}
        assessments={assessments}
        stats={stats}
        carbonFootprint={carbonFootprint}
        esgScore={esgScore}
      />
    </div>
  );
}
