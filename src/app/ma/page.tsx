import type { Metadata } from 'next';
import { Building } from 'lucide-react';

export const metadata: Metadata = {
  title: 'M&A — Lazynext',
  description: 'Manage corporate development, M&A targets, deals, due diligence, integrations, and valuations.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MAService } from '@/lib/services/ma-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { MADashboard } from './MADashboard';

export const dynamic = 'force-dynamic';

export default async function MAPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Corporate Development / M&A</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage M&A targets, deals, due diligence, integrations, and valuations.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Building}
            title="No workspace yet"
            description="Create a company first to access M&A capabilities."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [targets, deals, dueDiligence, integrations, valuations, metrics, stats] = await Promise.all([
    MAService.listTargets(organizationId),
    MAService.listDeals(organizationId),
    MAService.listDueDiligence(organizationId),
    MAService.listIntegrations(organizationId),
    MAService.listValuations(organizationId),
    MAService.getMAMetrics(organizationId),
    MAService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Building className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Corporate Development / M&A</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage M&A targets, deals, due diligence, integrations, and valuations.</p>
      </div>

      <MADashboard
        organizationId={organizationId}
        targets={targets}
        deals={deals}
        dueDiligence={dueDiligence}
        integrations={integrations}
        valuations={valuations}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
