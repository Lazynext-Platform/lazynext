import type { Metadata } from 'next';
import { Heart } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Corporate Giving — Lazynext',
  description: 'Manage corporate donations, sponsorships, grants, and volunteer programs.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateGivingService } from '@/lib/services/corporate-giving-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { CorporateGivingDashboard } from './CorporateGivingDashboard';

export const dynamic = 'force-dynamic';

export default async function CorporateGivingPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Corporate Giving</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage corporate donations, sponsorships, grants, and volunteer programs.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Heart}
            title="No workspace yet"
            description="Create a company first to access corporate giving management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [donations, sponsorships, grants, programs, metrics, stats] = await Promise.all([
    CorporateGivingService.listDonations(organizationId),
    CorporateGivingService.listSponsorships(organizationId),
    CorporateGivingService.listGrants(organizationId),
    CorporateGivingService.listPrograms(organizationId),
    CorporateGivingService.getCorporateGivingMetrics(organizationId),
    CorporateGivingService.getCorporateGivingStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Corporate Giving</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage corporate donations, sponsorships, grants, and volunteer programs.</p>
      </div>

      <CorporateGivingDashboard
        organizationId={organizationId}
        donations={donations}
        sponsorships={sponsorships}
        grants={grants}
        programs={programs}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
