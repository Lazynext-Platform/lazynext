import type { Metadata } from 'next';
import { Receipt } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tax Management — Lazynext',
  description: 'Tax records, calculations, filing schedules, and tax rate management.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TaxManagementService } from '@/lib/services/tax-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { TaxManagementDashboard } from './TaxManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function TaxManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Tax Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Tax records, calculations, filing schedules, and tax rate management.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Receipt}
            title="No workspace yet"
            description="Create a company first to start managing your taxes."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const organizationId = defaultWorkspace.organizationId;

  const [records, stats, obligations, rates, schedules] = await Promise.all([
    TaxManagementService.listTaxRecords(organizationId),
    TaxManagementService.getStats(organizationId),
    TaxManagementService.getTaxObligations(organizationId),
    TaxManagementService.getTaxRates(organizationId, ''),
    TaxManagementService.getFilingSchedule(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-6 w-6 text-accent-primary" />
            <h1 className="heading-display text-2xl">Tax Management</h1>
          </div>
          <p className="text-sm text-fg-secondary mt-1">
            Tax records, calculations, filing schedules, and tax rate management.
          </p>
        </div>
        <div className="text-xs text-fg-secondary">{defaultWorkspace.name}</div>
      </div>

      <TaxManagementDashboard
        organizationId={organizationId}
        records={records}
        stats={stats}
        obligations={obligations}
        rates={rates}
        schedules={schedules}
      />
    </div>
  );
}
