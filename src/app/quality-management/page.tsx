import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Quality Management — Lazynext',
  description: 'Manage quality standards, inspections, nonconformances, CAPAs, audits, and root cause analyses.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { QualityManagementService } from '@/lib/services/quality-management-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { QualityManagementDashboard } from './QualityManagementDashboard';

export const dynamic = 'force-dynamic';

export default async function QualityManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Quality Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage quality standards, inspections, nonconformances, CAPAs, audits, and root cause analyses.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={ShieldCheck}
            title="No workspace yet"
            description="Create a company first to access quality management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [standards, inspections, nonconformances, capas, audits, rootCauses, metrics, stats] = await Promise.all([
    QualityManagementService.listStandards(organizationId),
    QualityManagementService.listInspections(organizationId),
    QualityManagementService.listNonconformances(organizationId),
    QualityManagementService.listCAPAs(organizationId),
    QualityManagementService.listAudits(organizationId),
    QualityManagementService.listRootCauseAnalyses(organizationId),
    QualityManagementService.getQualityMetrics(organizationId),
    QualityManagementService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Quality Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage quality standards, inspections, nonconformances, CAPAs, audits, and root cause analyses.</p>
      </div>

      <QualityManagementDashboard
        organizationId={organizationId}
        standards={standards}
        inspections={inspections}
        nonconformances={nonconformances}
        capas={capas}
        audits={audits}
        rootCauses={rootCauses}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
