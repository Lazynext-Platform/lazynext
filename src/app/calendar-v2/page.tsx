import type { Metadata } from 'next';
import { Calendar as CalendarIcon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Calendar — Lazynext',
  description: 'Schedule and track events, deadlines, and milestones.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CalendarService } from '@/lib/services/calendar-service';
import { TimezoneUtils } from '@/lib/services/timezone-utils';
import { Card, Button, EmptyState } from '@/components/ui';
import { CalendarView } from './CalendarView';

export const dynamic = 'force-dynamic';

export default async function CalendarV2Page() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Calendar</h1>
          <p className="text-sm text-fg-secondary mt-1">Schedule and track events, deadlines, and milestones.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={CalendarIcon}
            title="No workspace yet"
            description="Create a company first to access the calendar."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const detectedTimezone = TimezoneUtils.detectTimezone();

  const [monthEvents, upcomingEvents, deadlines, ganttData, stats] = await Promise.all([
    CalendarService.getMonth(organizationId, year, month),
    CalendarService.getUpcoming(organizationId, { limit: 5 }),
    CalendarService.getDeadlines(organizationId, { limit: 20 }),
    CalendarService.getGanttData(organizationId),
    CalendarService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Calendar</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Schedule and track events, deadlines, and milestones.</p>
      </div>

      <CalendarView
        organizationId={organizationId}
        initialEvents={JSON.parse(JSON.stringify(monthEvents))}
        upcomingEvents={JSON.parse(JSON.stringify(upcomingEvents))}
        deadlines={JSON.parse(JSON.stringify(deadlines))}
        ganttItems={JSON.parse(JSON.stringify(ganttData.items))}
        stats={JSON.parse(JSON.stringify(stats))}
        detectedTimezone={detectedTimezone}
        year={year}
        month={month}
      />
    </div>
  );
}
