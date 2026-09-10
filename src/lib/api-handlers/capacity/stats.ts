import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CapacityService } from '@/lib/services/capacity-service';

/** GET /api/capacity/stats — capacity planning stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { total: 0, byStatus: {}, overallocatedCount: 0, underutilizedCount: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await CapacityService.getStats(organizationId);
  return NextResponse.json({ stats });
}
