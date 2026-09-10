import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IssueService } from '@/lib/services/issue-service';

/** GET /api/issues/stats — get issue stats for the user's organization */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      stats: {
        total: 0,
        byType: { bug: 0, feature: 0, task: 0, enhancement: 0, epic: 0 },
        byPriority: { low: 0, medium: 0, high: 0, urgent: 0, critical: 0 },
        byStatus: { open: 0, in_progress: 0, in_review: 0, done: 0, closed: 0 },
        openCount: 0,
        closedCount: 0,
        avgResolutionMs: 0,
      },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await IssueService.getStats(organizationId);
  return NextResponse.json({ stats });
}
