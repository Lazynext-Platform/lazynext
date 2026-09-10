import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EngagementService } from '@/lib/services/engagement-service';

/** GET /api/engagement/metrics — get engagement metrics */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ metrics: { responseRate: 0, averageScore: 0, actionCompletion: 0, totalSurveys: 0, totalResponses: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const metrics = await EngagementService.getEngagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
