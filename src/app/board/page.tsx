import type { Metadata } from 'next';
import { Gavel } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Board — Lazynext',
  description: 'Manage board meetings, resolutions, committees, members, and board packs.',
  robots: { index: false, follow: false },
};

import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BoardService } from '@/lib/services/board-service';
import { Card, Button, EmptyState } from '@/components/ui';
import { BoardDashboard } from './BoardDashboard';

export const dynamic = 'force-dynamic';

export default async function BoardPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);

  if (workspaces.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Board</h1>
          <p className="text-sm text-fg-secondary mt-1">Manage board meetings, resolutions, committees, members, and board packs.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Gavel}
            title="No workspace yet"
            description="Create a company first to access board management."
            action={<Button href="/company/new">Create Company</Button>}
          />
        </Card>
      </div>
    );
  }

  const organizationId = workspaces[0].organizationId;

  const [meetings, resolutions, committees, members, boardPacks, metrics, stats] = await Promise.all([
    BoardService.listMeetings(organizationId),
    BoardService.listResolutions(organizationId),
    BoardService.listCommittees(organizationId),
    BoardService.listMembers(organizationId),
    BoardService.listBoardPacks(organizationId),
    BoardService.getBoardMetrics(organizationId),
    BoardService.getStats(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Gavel className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Board</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Manage board meetings, resolutions, committees, members, and board packs.</p>
      </div>

      <BoardDashboard
        organizationId={organizationId}
        meetings={meetings}
        resolutions={resolutions}
        committees={committees}
        members={members}
        boardPacks={boardPacks}
        metrics={metrics}
        stats={stats}
      />
    </div>
  );
}
