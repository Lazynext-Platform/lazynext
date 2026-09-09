import type { Metadata } from 'next';
import { Plane } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Travel Management — Lazynext',
  description: 'Travel requests, itineraries, bookings, and cost summaries.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TravelService } from '@/lib/services/travel-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { TravelDashboard } from './TravelDashboard';

export const dynamic = 'force-dynamic';

export default async function TravelPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Travel Management</h1>
          <p className="text-sm text-fg-secondary mt-1">Travel requests, itineraries, bookings, and cost summaries.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Plane}
            title="No workspace yet"
            description="Create a company first to access travel management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [requests, costSummary, stats] = await Promise.all([
    TravelService.listTravelRequests(organizationId),
    TravelService.getTravelCostSummary(organizationId),
    TravelService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Plane className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Travel Management</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Travel requests, itineraries, bookings, and cost summaries.</p>
      </div>

      <TravelDashboard
        organizationId={organizationId}
        requests={requests}
        costSummary={costSummary}
        stats={stats}
      />
    </div>
  );
}
