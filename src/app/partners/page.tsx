import type { Metadata } from 'next';
import { Handshake } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Partners — Lazynext',
  description: 'Manage channel partners, programs, deal registrations, co-marketing campaigns, and partner tiers.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PartnerService } from '@/lib/services/partner-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { PartnerDashboard } from './PartnerDashboard';

export const dynamic = 'force-dynamic';

export default async function PartnersPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Partners</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage channel partners, programs, deal registrations, co-marketing campaigns, and partner tiers.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Handshake}
            title="No workspace yet"
            description="Create a company first to access partner management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [partners, programs, deals, comarketing, tiers, metrics, stats] = await Promise.all([
    PartnerService.listPartners(organizationId),
    PartnerService.listPrograms(organizationId),
    PartnerService.listDeals(organizationId),
    PartnerService.listCoMarketing(organizationId),
    PartnerService.listTiers(organizationId),
    PartnerService.getPartnerMetrics(organizationId),
    PartnerService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Handshake className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Partners</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage channel partners, programs, deal registrations, co-marketing campaigns, and partner tiers.</p>
      </div>

      <PartnerDashboard
        organizationId={organizationId}
        partners={partners}
        programs={programs}
        deals={deals}
        comarketing={comarketing}
        tiers={tiers}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
