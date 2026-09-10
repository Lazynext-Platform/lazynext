import type { Metadata } from 'next';
import { Tags } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Merchandising — Lazynext',
  description: 'Manage assortments, planograms, pricing, and promotions.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MerchandisingService } from '@/lib/services/merchandising-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { MerchandisingDashboard } from './MerchandisingDashboard';

export const dynamic = 'force-dynamic';

export default async function MerchandisingPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Merchandising</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage assortments, planograms, pricing, and promotions.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Tags}
            title="No workspace yet"
            description="Create a company first to access merchandising management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [assortments, planograms, pricings, promotions, metrics, stats] = await Promise.all([
    MerchandisingService.listAssortments(organizationId),
    MerchandisingService.listPlanograms(organizationId),
    MerchandisingService.listPricings(organizationId),
    MerchandisingService.listPromotions(organizationId),
    MerchandisingService.getMerchandisingMetrics(organizationId),
    MerchandisingService.getMerchandisingStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Tags className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Merchandising</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage assortments, planograms, pricing, and promotions.</p>
      </div>

      <MerchandisingDashboard
        organizationId={organizationId}
        assortments={assortments}
        planograms={planograms}
        pricings={pricings}
        promotions={promotions}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
