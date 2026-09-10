import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { StrategyService } from '@/lib/services/strategy-service';

/** GET /api/strategy/stats — get strategy stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      totalInitiatives: 0,
      byStatus: {},
      byPriority: {},
      totalMilestones: 0,
      achievedMilestones: 0,
      avgProgress: 0,
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await StrategyService.getStats(organizationId);
  return NextResponse.json(stats);
}
