import type { Metadata } from 'next';
import { Landmark } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Banking — Lazynext',
  description: 'Manage corporate bank accounts, transactions, reconciliations, and wire transfers.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BankingService } from '@/lib/services/banking-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { BankingDashboard } from './BankingDashboard';

export const dynamic = 'force-dynamic';

export default async function BankingPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Banking</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage corporate bank accounts, transactions, reconciliations, and wire transfers.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Landmark}
            title="No workspace yet"
            description="Create a company first to access banking management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [accounts, transactions, reconciliations, wires, metrics, stats] = await Promise.all([
    BankingService.listAccounts(organizationId),
    BankingService.listTransactions(organizationId),
    BankingService.listReconciliations(organizationId),
    BankingService.listWireTransfers(organizationId),
    BankingService.getBankingMetrics(organizationId),
    BankingService.getBankingStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Landmark className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Banking</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage corporate bank accounts, transactions, reconciliations, and wire transfers.</p>
      </div>

      <BankingDashboard
        organizationId={organizationId}
        accounts={accounts}
        transactions={transactions}
        reconciliations={reconciliations}
        wires={wires}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
