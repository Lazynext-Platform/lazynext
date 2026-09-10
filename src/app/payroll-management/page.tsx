import type { Metadata } from 'next';
import { Wallet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Payroll Management — Lazynext',
  description: 'Manage payroll runs, records, approvals, and payments.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PayrollManagementService } from '@/lib/services/payroll-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { PayrollManagementDashboard } from './PayrollManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function PayrollManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Payroll Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage payroll runs, records, approvals, and payments.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Wallet}
            title="No workspace yet"
            description="Create a company first to start managing payroll."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const organizationId = defaultWorkspace.organizationId;

  const [records, runs, stats, summary] = await Promise.all([
    PayrollManagementService.listPayrollRecords(organizationId),
    PayrollManagementService.listPayrollRuns(organizationId),
    PayrollManagementService.getStats(organizationId),
    PayrollManagementService.getPayrollSummary(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-accent-primary" />
            <h1 className="heading-display text-2xl">Payroll Management</h1>
          </div>
          <p className="text-sm text-fg-secondary mt-1">
            Manage payroll runs, records, approvals, and payments.
          </p>
        </div>
        <div className="text-xs text-fg-secondary">{defaultWorkspace.name}</div>
      </div>

      <PayrollManagementDashboard
        organizationId={organizationId}
        records={records}
        runs={runs}
        stats={stats}
        summary={summary}
      />
    </div>
  );
}
