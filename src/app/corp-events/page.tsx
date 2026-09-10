import type { Metadata } from 'next';
import { Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Corporate Events — Lazynext',
  description: 'Manage corporate events, conferences, registrations, speakers, and venues.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EventsService } from '@/lib/services/events-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { EventsDashboard } from './EventsDashboard';

export const dynamic = 'force-dynamic';

export default async function CorpEventsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Corporate Events</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage corporate events, conferences, registrations, speakers, and venues.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Calendar}
            title="No workspace yet"
            description="Create a company first to access event management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [events, registrations, speakers, venues, metrics, stats] = await Promise.all([
    EventsService.listEvents(organizationId),
    EventsService.listRegistrations(organizationId),
    EventsService.listSpeakers(organizationId),
    EventsService.listVenues(organizationId),
    EventsService.getEventMetrics(organizationId),
    EventsService.getEventStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Corporate Events</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage corporate events, conferences, registrations, speakers, and venues.</p>
      </div>

      <EventsDashboard
        organizationId={organizationId}
        events={events}
        registrations={registrations}
        speakers={speakers}
        venues={venues}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
