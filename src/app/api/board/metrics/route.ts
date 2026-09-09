import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BoardService } from '@/lib/services/board-service';

/** GET /api/board/metrics — get board metrics */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ metrics: { meetingCount: 0, completedMeetingCount: 0, resolutionPassRate: 0, totalResolutions: 0, passedResolutions: 0, committeeCoverage: 0, totalCommittees: 0, activeCommittees: 0, boardPackCount: 0, distributedBoardPackCount: 0, boardPackTimeliness: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const metrics = await BoardService.getBoardMetrics(organizationId);
  return NextResponse.json({ metrics });
}
