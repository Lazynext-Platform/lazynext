import type { Metadata } from 'next';
import { BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Accounting — Lazynext',
  description: 'General ledger, chart of accounts, journal entries, trial balance, and financial statements.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AccountingService } from '@/lib/services/accounting-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { AccountingDashboard } from './AccountingDashboard';

export const dynamic = 'force-dynamic';

export default async function AccountingPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Accounting</h1>
          <p className="text-sm text-fg-secondary mt-1">General ledger, chart of accounts, journal entries, trial balance, and financial statements.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={BookOpen}
            title="No workspace yet"
            description="Create a company first to start managing your books."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const organizationId = defaultWorkspace.organizationId;

  const [accounts, entries, stats] = await Promise.all([
    AccountingService.getChartOfAccounts(organizationId),
    AccountingService.listJournalEntries(organizationId),
    AccountingService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-accent-primary" />
            <h1 className="heading-display text-2xl">Accounting</h1>
          </div>
          <p className="text-sm text-fg-secondary mt-1">
            General ledger, chart of accounts, journal entries, trial balance, and financial statements.
          </p>
        </div>
        <div className="text-xs text-fg-secondary">{defaultWorkspace.name}</div>
      </div>

      <AccountingDashboard
        organizationId={organizationId}
        accounts={accounts}
        entries={entries}
        stats={stats}
      />
    </div>
  );
}
