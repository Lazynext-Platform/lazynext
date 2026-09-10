import type { Metadata } from 'next';
import { FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Records Management — Lazynext',
  description: 'Manage records retention schedules, items, disposals, and legal holds.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecordsManagementService } from '@/lib/services/records-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { RecordsManagementDashboard } from './RecordsManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function RecordsManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Records Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage records retention schedules, items, disposals, and legal holds.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={FileText}
            title="No workspace yet"
            description="Create a company first to access records management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [schedules, items, disposals, legalHolds, metrics, stats] = await Promise.all([
    RecordsManagementService.listSchedules(organizationId),
    RecordsManagementService.listItems(organizationId),
    RecordsManagementService.listDisposals(organizationId),
    RecordsManagementService.listLegalHolds(organizationId),
    RecordsManagementService.getRecordsManagementMetrics(organizationId),
    RecordsManagementService.getRecordsManagementStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Records Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage records retention schedules, items, disposals, and legal holds.</p>
      </div>

      <RecordsManagementDashboard
        organizationId={organizationId}
        schedules={schedules}
        items={items}
        disposals={disposals}
        legalHolds={legalHolds}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
