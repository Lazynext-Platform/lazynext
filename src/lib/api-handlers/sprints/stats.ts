import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { SprintService } from '@/lib/services/sprint-service';

/** GET /api/sprints/stats — get sprint stats for the user's organization */
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
        byStatus: { planning: 0, active: 0, completed: 0, cancelled: 0 },
        avgVelocity: 0,
        totalIssuesCompleted: 0,
      },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await SprintService.getStats(organizationId);
  return NextResponse.json({ stats });
}
