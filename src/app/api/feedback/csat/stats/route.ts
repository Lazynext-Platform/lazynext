import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CsatService } from '@/lib/services/csat-service';

/** GET /api/feedback/csat/stats — get CSAT stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { totalSurveys: 0, totalResponses: 0, avgCsat: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await CsatService.getStats(organizationId);
  return NextResponse.json({ stats });
}
