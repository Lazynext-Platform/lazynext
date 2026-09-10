import type { Metadata } from 'next';
import { Briefcase } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Portfolio Management — Lazynext',
  description: 'Manage investment accounts, holdings, transactions, and allocations.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioManagementService } from '@/lib/services/portfolio-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { PortfolioManagementDashboard } from './PortfolioManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function PortfolioManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Portfolio Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage investment accounts, holdings, transactions, and allocations.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Briefcase}
            title="No workspace yet"
            description="Create a company first to access portfolio management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [accounts, holdings, transactions, allocations, metrics, stats] = await Promise.all([
    PortfolioManagementService.listAccounts(organizationId),
    PortfolioManagementService.listHoldings(organizationId),
    PortfolioManagementService.listTransactions(organizationId),
    PortfolioManagementService.listAllocations(organizationId),
    PortfolioManagementService.getPortfolioManagementMetrics(organizationId),
    PortfolioManagementService.getPortfolioManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Portfolio Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage investment accounts, holdings, transactions, and allocations.</p>
      </div>

      <PortfolioManagementDashboard
        organizationId={organizationId}
        accounts={accounts}
        holdings={holdings}
        transactions={transactions}
        allocations={allocations}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
