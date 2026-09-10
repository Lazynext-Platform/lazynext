import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BoardService } from '@/lib/services/board-service';

/** GET /api/board/stats — get board stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { meetingCount: 0, resolutionCount: 0, committeeCount: 0, memberCount: 0, boardPackCount: 0, activeMemberCount: 0, activeCommitteeCount: 0, byMeetingStatus: {}, byResolutionStatus: {}, byMemberRole: {} } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await BoardService.getStats(organizationId);
  return NextResponse.json({ stats });
}
