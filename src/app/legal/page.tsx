import type { Metadata } from 'next';
import { Scale } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Legal & Contracts — Lazynext',
  description: 'Manage contracts, legal matters, and obligations in one place.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LegalContractService } from '@/lib/services/legal-contract-service';
import { LegalMatterService } from '@/lib/services/legal-matter-service';
import { LegalObligationService } from '@/lib/services/legal-obligation-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { LegalDashboard } from './LegalDashboard';

export const dynamic = 'force-dynamic';

export default async function LegalPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Legal & Contracts</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage contracts, legal matters, and obligations.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Scale}
            title="No workspace yet"
            description="Create a company first to access legal & contracts."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [
    contracts, contractStats, expiringContracts, expiredContracts,
    matters, matterStats, openMatters,
    obligations, obligationStats, overdueObligations, breachedObligations, upcomingObligations,
  ] = await Promise.all([
    LegalContractService.list(organizationId),
    LegalContractService.getStats(organizationId),
    LegalContractService.getExpiring(organizationId),
    LegalContractService.getExpired(organizationId),
    LegalMatterService.list(organizationId),
    LegalMatterService.getStats(organizationId),
    LegalMatterService.getOpen(organizationId),
    LegalObligationService.list(organizationId),
    LegalObligationService.getStats(organizationId),
    LegalObligationService.getOverdue(organizationId),
    LegalObligationService.getBreached(organizationId),
    LegalObligationService.getUpcoming(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Legal & Contracts</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage contracts, legal matters, and obligations in one place.</p>
      </div>

      <LegalDashboard
        organizationId={organizationId}
        initialContracts={contracts}
        initialContractStats={contractStats}
        initialExpiringContracts={expiringContracts}
        initialExpiredContracts={expiredContracts}
        initialMatters={matters}
        initialMatterStats={matterStats}
        initialOpenMatters={openMatters}
        initialObligations={obligations}
        initialObligationStats={obligationStats}
        initialOverdueObligations={overdueObligations}
        initialBreachedObligations={breachedObligations}
        initialUpcomingObligations={upcomingObligations}
      />
    </div>
  );
}
