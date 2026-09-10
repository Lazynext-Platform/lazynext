import type { Metadata } from 'next';
import { TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Investor Relations — Lazynext',
  description: 'Manage investors, funding rounds, cap table, communications, and investor updates.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { InvestorRelationsDashboard } from './InvestorRelationsDashboard';

export const dynamic = 'force-dynamic';

export default async function InvestorRelationsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Investor Relations</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage investors, funding rounds, cap table, communications, and investor updates.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={TrendingUp}
            title="No workspace yet"
            description="Create a company first to access investor relations."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [investors, fundingRounds, capTable, communications, updates, metrics, stats] = await Promise.all([
    InvestorRelationsService.listInvestors(organizationId),
    InvestorRelationsService.listFundingRounds(organizationId),
    InvestorRelationsService.listCapTable(organizationId),
    InvestorRelationsService.listCommunications(organizationId),
    InvestorRelationsService.listUpdates(organizationId),
    InvestorRelationsService.getIRMetrics(organizationId),
    InvestorRelationsService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Investor Relations</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage investors, funding rounds, cap table, communications, and investor updates.</p>
      </div>

      <InvestorRelationsDashboard
        organizationId={organizationId}
        investors={investors}
        fundingRounds={fundingRounds}
        capTable={capTable}
        communications={communications}
        updates={updates}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
