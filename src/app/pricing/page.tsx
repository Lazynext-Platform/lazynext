import type { Metadata } from 'next';
import { DollarSign } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pricing — Lazynext',
  description: 'Manage pricing models, tiers, experiments, discounts, and revenue streams.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PricingService } from '@/lib/services/pricing-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { PricingDashboard } from './PricingDashboard';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Pricing & Monetization</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage pricing models, tiers, experiments, discounts, and revenue streams.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={DollarSign}
            title="No workspace yet"
            description="Create a company first to access pricing management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [models, tiers, experiments, discounts, revenueStreams, metrics, stats] = await Promise.all([
    PricingService.listModels(organizationId),
    PricingService.listTiers(organizationId),
    PricingService.listExperiments(organizationId),
    PricingService.listDiscountRules(organizationId),
    PricingService.listRevenueStreams(organizationId),
    PricingService.getPricingMetrics(organizationId),
    PricingService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Pricing & Monetization</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage pricing models, tiers, experiments, discounts, and revenue streams.</p>
      </div>

      <PricingDashboard
        organizationId={organizationId}
        models={models}
        tiers={tiers}
        experiments={experiments}
        discounts={discounts}
        revenueStreams={revenueStreams}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
