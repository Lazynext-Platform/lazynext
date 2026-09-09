import type { Metadata } from 'next';
import { Gavel, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Governance & Compliance — Lazynext',
  description: 'Monitor policies, compliance checks, and data retention across your organization.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { GovernanceService } from '@/lib/services/governance';
import { Card, Button, EmptyState } from '@/components/ui';
import { GovernanceDashboard } from './GovernanceDashboard';

export const dynamic = 'force-dynamic';

export default async function GovernancePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Governance & Compliance</h1>
          <p className="text-sm text-fg-secondary mt-1">Monitor policies, compliance checks, and data retention.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Shield}
            title="No workspace yet"
            description="Create a company first to start governing policies and compliance."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const defaultWorkspace = workspaces[0];
  const organizationId = defaultWorkspace.organizationId;

  const [dashboard, policies, checks, retentionRules] = await Promise.all([
    GovernanceService.getGovernanceDashboard(organizationId),
    GovernanceService.listPolicies(organizationId),
    GovernanceService.listChecks(organizationId, { limit: 20 }),
    GovernanceService.listRetentionRules(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Gavel className="h-6 w-6 text-accent-primary" />
            <h1 className="heading-display text-2xl">Governance & Compliance</h1>
          </div>
          <p className="text-sm text-fg-secondary mt-1">
            Monitor policies, compliance checks, and data retention across your organization.
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-fg-secondary">
          <Shield className="h-3 w-3" /> {defaultWorkspace.name}
        </div>
      </div>

      <GovernanceDashboard
        organizationId={organizationId}
        dashboard={dashboard}
        policies={policies}
        checks={checks}
        retentionRules={retentionRules}
      />
    </div>
  );
}
