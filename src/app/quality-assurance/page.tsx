import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Quality Assurance — Lazynext',
  description: 'Manage inspections, defects, CAPAs, and quality audits.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { QualityAssuranceService } from '@/lib/services/quality-assurance-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { QualityAssuranceDashboard } from './QualityAssuranceDashboard';

export const dynamic = 'force-dynamic';

export default async function QualityAssurancePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Quality Assurance</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage inspections, defects, CAPAs, and quality audits.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={ShieldCheck}
            title="No workspace yet"
            description="Create a company first to access quality assurance management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [inspections, defects, capas, audits, metrics, stats] = await Promise.all([
    QualityAssuranceService.listInspections(organizationId),
    QualityAssuranceService.listDefects(organizationId),
    QualityAssuranceService.listCapas(organizationId),
    QualityAssuranceService.listAudits(organizationId),
    QualityAssuranceService.getQualityAssuranceMetrics(organizationId),
    QualityAssuranceService.getQualityAssuranceStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Quality Assurance</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage inspections, defects, CAPAs, and quality audits.</p>
      </div>

      <QualityAssuranceDashboard
        organizationId={organizationId}
        inspections={inspections}
        defects={defects}
        capas={capas}
        audits={audits}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
