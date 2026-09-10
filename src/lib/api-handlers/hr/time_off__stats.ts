import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TimeOffService } from '@/lib/services/time-off-service';

/** GET /api/hr/time-off/stats — get time-off stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { total: 0, pending: 0, approved: 0, denied: 0, cancelled: 0, byStatus: {}, byType: {}, totalDays: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await TimeOffService.getStats(organizationId);
  return NextResponse.json({ stats });
}
