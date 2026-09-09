import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EngagementService } from '@/lib/services/engagement-service';

/** GET /api/engagement/stats — get engagement stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: null });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await EngagementService.getEngagementStats(organizationId);
  return NextResponse.json({ stats });
}
