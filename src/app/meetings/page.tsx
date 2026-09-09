import type { Metadata } from 'next';
import { Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Meeting Intelligence — Lazynext',
  description: 'Meeting notes, AI summaries, action items, and follow-ups.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MeetingService } from '@/lib/services/meeting-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { MeetingDashboard, type Meeting, type ActionItem } from './MeetingDashboard';

export const dynamic = 'force-dynamic';

export default async function MeetingsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Meeting Intelligence</h1>
          <p className="text-sm text-fg-secondary mt-1">Meeting notes, AI summaries, action items, and follow-ups.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Calendar}
            title="No workspace yet"
            description="Create a company first to start managing meetings."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;
  const [meetings, upcoming, stats, actionItems] = await Promise.all([
    MeetingService.list(organizationId),
    MeetingService.getUpcoming(organizationId),
    MeetingService.getStats(organizationId),
    MeetingService.getActionItems(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Meeting Intelligence</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Meeting notes, AI summaries, action items, and follow-ups.</p>
      </div>

      <MeetingDashboard
        organizationId={organizationId}
        meetings={meetings as unknown as Meeting[]}
        upcoming={upcoming as unknown as Meeting[]}
        stats={stats}
        actionItems={actionItems as unknown as ActionItem[]}
      />
    </div>
  );
}
