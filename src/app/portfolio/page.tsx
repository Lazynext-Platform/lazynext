import type { Metadata } from 'next';
import { TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Investment Portfolio — Lazynext',
  description: 'Manage investment holdings, transactions, allocations, and risk assessments.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioService } from '@/lib/services/portfolio-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { PortfolioDashboard } from './PortfolioDashboard';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Investment Portfolio</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage investment holdings, transactions, allocations, and risk assessments.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={TrendingUp}
            title="No workspace yet"
            description="Create a company first to access investment portfolio management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [holdings, transactions, allocations, risks, metrics, stats] = await Promise.all([
    PortfolioService.listHoldings(organizationId),
    PortfolioService.listTransactions(organizationId),
    PortfolioService.listAllocations(organizationId),
    PortfolioService.listRisks(organizationId),
    PortfolioService.getPortfolioMetrics(organizationId),
    PortfolioService.getPortfolioStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Investment Portfolio</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage investment holdings, transactions, allocations, and risk assessments.</p>
      </div>

      <PortfolioDashboard
        organizationId={organizationId}
        holdings={holdings}
        transactions={transactions}
        allocations={allocations}
        risks={risks}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
