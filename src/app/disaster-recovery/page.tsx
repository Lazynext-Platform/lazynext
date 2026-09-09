import type { Metadata } from 'next';
import { ServerCog } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Disaster Recovery Management — Lazynext',
  description: 'Manage recovery plans, backup strategies, recovery tests, and recovery sites.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DisasterRecoveryService } from '@/lib/services/disaster-recovery-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { DisasterRecoveryDashboard } from './DisasterRecoveryDashboard';

export const dynamic = 'force-dynamic';

export default async function DisasterRecoveryPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Disaster Recovery</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage recovery plans, backup strategies, recovery tests, and recovery sites.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={ServerCog}
            title="No workspace yet"
            description="Create a company first to access disaster recovery."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [plans, backups, tests, sites, metrics, stats] = await Promise.all([
    DisasterRecoveryService.listRecoveryPlans(organizationId),
    DisasterRecoveryService.listBackupStrategies(organizationId),
    DisasterRecoveryService.listRecoveryTests(organizationId),
    DisasterRecoveryService.listRecoverySites(organizationId),
    DisasterRecoveryService.getDisasterRecoveryMetrics(organizationId),
    DisasterRecoveryService.getDisasterRecoveryStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <ServerCog className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Disaster Recovery</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage recovery plans, backup strategies, recovery tests, and recovery sites.</p>
      </div>

      <DisasterRecoveryDashboard
        organizationId={organizationId}
        plans={plans}
        backups={backups}
        tests={tests}
        sites={sites}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
