import type { Metadata } from 'next';
import { Map } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Customer Journey — Lazynext',
  description: 'Map customer journeys, touchpoints, stages, and experience scores.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CustomerJourneyService } from '@/lib/services/customer-journey-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { CustomerJourneyDashboard } from './CustomerJourneyDashboard';

export const dynamic = 'force-dynamic';

export default async function CustomerJourneyPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Customer Journey</h1>
          <p className="text-sm text-fg-secondary mt-1">Map customer journeys, touchpoints, stages, and experience scores.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Map}
            title="No workspace yet"
            description="Create a company first to access customer journey management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [journeys, stages, touchpoints, scores, metrics, stats] = await Promise.all([
    CustomerJourneyService.listJourneys(organizationId),
    CustomerJourneyService.listStages(organizationId),
    CustomerJourneyService.listTouchpoints(organizationId),
    CustomerJourneyService.listScores(organizationId),
    CustomerJourneyService.getCustomerJourneyMetrics(organizationId),
    CustomerJourneyService.getCustomerJourneyStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Map className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Customer Journey</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Map customer journeys, touchpoints, stages, and experience scores.</p>
      </div>

      <CustomerJourneyDashboard
        organizationId={organizationId}
        journeys={journeys}
        stages={stages}
        touchpoints={touchpoints}
        scores={scores}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
