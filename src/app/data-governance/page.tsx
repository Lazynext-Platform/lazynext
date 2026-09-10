import type { Metadata } from 'next';
import { Database } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Data Governance — Lazynext',
  description: 'Manage data catalog, quality rules, lineage, stewardship, and master data management.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataGovernanceService } from '@/lib/services/data-governance-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { DataGovernanceDashboard } from './DataGovernanceDashboard';

export const dynamic = 'force-dynamic';

export default async function DataGovernancePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Data Governance</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage data catalog, quality rules, lineage, stewardship, and master data management.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Database}
            title="No workspace yet"
            description="Create a company first to access data governance."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [catalog, qualityRules, lineage, stewardship, mdmRecords, metrics, stats] = await Promise.all([
    DataGovernanceService.listCatalog(organizationId),
    DataGovernanceService.listQualityRules(organizationId),
    DataGovernanceService.listLineage(organizationId),
    DataGovernanceService.listStewardship(organizationId),
    DataGovernanceService.listMDMRecords(organizationId),
    DataGovernanceService.getDGMetrics(organizationId),
    DataGovernanceService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Database className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Data Governance</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage data catalog, quality rules, lineage, stewardship, and master data management.</p>
      </div>

      <DataGovernanceDashboard
        organizationId={organizationId}
        catalog={catalog}
        qualityRules={qualityRules}
        lineage={lineage}
        stewardship={stewardship}
        mdmRecords={mdmRecords}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
