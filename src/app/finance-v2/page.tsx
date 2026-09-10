import type { Metadata } from 'next';
import { DollarSign } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Finance — Lazynext',
  description: 'Invoices, expenses, revenue, payroll, and tax management.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FinanceService } from '@/lib/services/finance';
import { Card, Button, EmptyState } from '@/components/ui';
import { FinanceDashboard } from './FinanceDashboard';

export const dynamic = 'force-dynamic';

export default async function FinanceV2Page() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Finance</h1>
          <p className="text-sm text-fg-secondary mt-1">Invoices, expenses, revenue, payroll, and tax management.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={DollarSign}
            title="No workspace yet"
            description="Create a company first to start managing finances."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const organizationId = defaultWorkspace.organizationId;

  const dashboard = await FinanceService.getFinancialDashboard(organizationId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-accent-primary" />
            <h1 className="heading-display text-2xl">Finance</h1>
          </div>
          <p className="text-sm text-fg-secondary mt-1">
            Invoices, expenses, revenue, payroll, and tax management.
          </p>
        </div>
        <div className="text-xs text-fg-secondary">{defaultWorkspace.name}</div>
      </div>

      <FinanceDashboard organizationId={organizationId} dashboard={dashboard} />
    </div>
  );
}
