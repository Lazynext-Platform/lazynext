import type { Metadata } from 'next';
import { ClipboardCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Internal Audit — Lazynext',
  description: 'Manage audit plans, findings, schedules, and remediation tracking.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InternalAuditService } from '@/lib/services/internal-audit-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { InternalAuditDashboard } from './InternalAuditDashboard';

export const dynamic = 'force-dynamic';

export default async function InternalAuditPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Internal Audit</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage audit plans, findings, schedules, and remediation tracking.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={ClipboardCheck}
            title="No workspace yet"
            description="Create a company first to access internal audit management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [plans, findings, schedules, remediations, metrics, stats] = await Promise.all([
    InternalAuditService.listPlans(organizationId),
    InternalAuditService.listFindings(organizationId),
    InternalAuditService.listSchedules(organizationId),
    InternalAuditService.listRemediations(organizationId),
    InternalAuditService.getInternalAuditMetrics(organizationId),
    InternalAuditService.getInternalAuditStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Internal Audit</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage audit plans, findings, schedules, and remediation tracking.</p>
      </div>

      <InternalAuditDashboard
        organizationId={organizationId}
        plans={plans}
        findings={findings}
        schedules={schedules}
        remediations={remediations}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
