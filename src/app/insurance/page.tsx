import type { Metadata } from 'next';
import { Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Insurance — Lazynext',
  description: 'Manage insurance policies, claims, coverages, and brokers.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InsuranceService } from '@/lib/services/insurance-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { InsuranceDashboard } from './InsuranceDashboard';

export const dynamic = 'force-dynamic';

export default async function InsurancePage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Insurance Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage insurance policies, claims, coverages, and brokers.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Shield}
            title="No workspace yet"
            description="Create a company first to access insurance management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [policies, claims, coverages, brokers, stats, metrics] = await Promise.all([
    InsuranceService.listPolicies(organizationId),
    InsuranceService.listClaims(organizationId),
    InsuranceService.listCoverages(organizationId),
    InsuranceService.listBrokers(organizationId),
    InsuranceService.getStats(organizationId),
    InsuranceService.getInsuranceMetrics(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Insurance Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage insurance policies, claims, coverages, and brokers.</p>
      </div>

      <InsuranceDashboard
        organizationId={organizationId}
        policies={policies}
        claims={claims}
        coverages={coverages}
        brokers={brokers}
        stats={stats}
        metrics={metrics}
      />
    </div>
  );
}
