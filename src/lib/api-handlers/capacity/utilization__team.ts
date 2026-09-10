import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CapacityService } from '@/lib/services/capacity-service';

/** GET /api/capacity/utilization/team — get team utilization */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ utilization: { users: [], averageUtilization: 0, totalAllocated: 0, totalMax: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const utilization = await CapacityService.getTeamUtilization(organizationId);
  return NextResponse.json({ utilization });
}
