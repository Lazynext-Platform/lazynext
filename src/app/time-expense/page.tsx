import type { Metadata } from 'next';
import { Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Time & Expense — Lazynext',
  description: 'Track timesheets, time entries, and expense reports.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TimesheetService } from '@/lib/services/timesheet-service';
import { ExpenseServiceV2 } from '@/lib/services/expense-service-v2';
import { Card, Button, EmptyState } from '@/components/ui';
import { TimeExpenseDashboard } from './TimeExpenseDashboard';

export const dynamic = 'force-dynamic';

export default async function TimeExpensePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Time & Expense</h1>
          <p className="text-sm text-fg-secondary mt-1">Track timesheets, time entries, and expense reports.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Clock}
            title="No workspace yet"
            description="Create a company first to start tracking time and expenses."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const [timesheets, expenses, timesheetStats, expenseStats] = await Promise.all([
    TimesheetService.list(organizationId),
    ExpenseServiceV2.list(organizationId),
    TimesheetService.getStats(organizationId),
    ExpenseServiceV2.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Time & Expense</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Track timesheets, time entries, and expense reports.</p>
      </div>

      <TimeExpenseDashboard
        organizationId={organizationId}
        timesheets={timesheets}
        expenses={expenses}
        timesheetStats={timesheetStats}
        expenseStats={expenseStats}
      />
    </div>
  );
}
