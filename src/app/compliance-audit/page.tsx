import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Compliance & Audit — Lazynext',
  description: 'Frameworks, controls, tests, findings, evidence, and audit reports.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ComplianceAuditService } from '@/lib/services/compliance-audit-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { ComplianceAuditDashboard } from './ComplianceAuditDashboard';

export const dynamic = 'force-dynamic';

export default async function ComplianceAuditPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Compliance & Audit</h1>
          <p className="text-sm text-fg-secondary mt-1">Frameworks, controls, tests, findings, evidence, and audit reports.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={ShieldCheck}
            title="No workspace yet"
            description="Create a company first to start managing compliance."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const [frameworks, controls, tests, findings, evidence, reports, gaps, score, stats] = await Promise.all([
    ComplianceAuditService.listFrameworks(organizationId),
    ComplianceAuditService.listControls(organizationId),
    ComplianceAuditService.listControlTests(organizationId),
    ComplianceAuditService.listFindings(organizationId),
    ComplianceAuditService.listEvidence(organizationId),
    ComplianceAuditService.listAuditReports(organizationId),
    ComplianceAuditService.getGapAnalysis(organizationId),
    ComplianceAuditService.getComplianceScore(organizationId),
    ComplianceAuditService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Compliance & Audit</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Frameworks, controls, tests, findings, evidence, and audit reports.</p>
      </div>

      <ComplianceAuditDashboard
        organizationId={organizationId}
        frameworks={frameworks}
        controls={controls}
        tests={tests}
        findings={findings}
        evidence={evidence}
        reports={reports}
        gaps={gaps}
        score={score}
        stats={stats}
      />
    </div>
  );
}
