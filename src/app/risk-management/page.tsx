import type { Metadata } from 'next';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Risk Management — Lazynext',
  description: 'Identify, assess, and mitigate organizational risks with a risk register and matrix.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RiskService } from '@/lib/services/risk-service';
import { RiskMitigationService } from '@/lib/services/risk-mitigation-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { RiskDashboard } from './RiskDashboard';

export const dynamic = 'force-dynamic';

export default async function RiskManagementPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Risk Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Identify, assess, and mitigate organizational risks.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={AlertTriangle}
            title="No workspace yet"
            description="Create a company first to access risk management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [risks, highRisks, riskMatrix, riskStats, mitigations, mitigationStats, overdueMitigations] = await Promise.all([
    RiskService.list(organizationId),
    RiskService.getHighRisks(organizationId),
    RiskService.getRiskMatrix(organizationId),
    RiskService.getStats(organizationId),
    RiskMitigationService.list(organizationId),
    RiskMitigationService.getStats(organizationId),
    RiskMitigationService.getOverdue(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Risk Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Identify, assess, and mitigate organizational risks with a risk register and matrix.</p>
      </div>

      <RiskDashboard
        organizationId={organizationId}
        initialRisks={risks}
        initialHighRisks={highRisks}
        initialRiskMatrix={riskMatrix}
        initialRiskStats={riskStats}
        initialMitigations={mitigations}
        initialMitigationStats={mitigationStats}
        initialOverdueMitigations={overdueMitigations}
      />
    </div>
  );
}
