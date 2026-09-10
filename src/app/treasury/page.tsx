import type { Metadata } from 'next';
import { Banknote } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Treasury & Cash Management — Lazynext',
  description: 'Manage bank accounts, cash positions, forecasts, and payment approvals.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TreasuryService } from '@/lib/services/treasury-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { TreasuryDashboard } from './TreasuryDashboard';

export const dynamic = 'force-dynamic';

export default async function TreasuryPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Treasury & Cash Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage bank accounts, cash positions, forecasts, and payment approvals.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Banknote}
            title="No workspace yet"
            description="Create a company first to start managing treasury."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const [bankAccounts, cashPositions, forecasts, paymentApprovals, liquidity, stats] = await Promise.all([
    TreasuryService.listBankAccounts(organizationId),
    TreasuryService.getCashPositions(organizationId),
    TreasuryService.listForecasts(organizationId),
    TreasuryService.listPaymentApprovals(organizationId),
    TreasuryService.getLiquidityAnalysis(organizationId),
    TreasuryService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Banknote className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Treasury & Cash Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage bank accounts, cash positions, forecasts, and payment approvals.</p>
      </div>

      <TreasuryDashboard
        organizationId={organizationId}
        bankAccounts={bankAccounts}
        cashPositions={cashPositions}
        forecasts={forecasts}
        paymentApprovals={paymentApprovals}
        liquidity={liquidity}
        stats={stats}
      />
    </div>
  );
}
