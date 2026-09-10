import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CapacityService } from '@/lib/services/capacity-service';

/** GET /api/capacity/utilization/user/[userId] — get a user's utilization */
export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ utilization: { userId: '', allocatedHours: 0, maxHours: 40, utilization: 0, allocationCount: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const { userId } = params;
  const utilization = await CapacityService.getUserUtilization(organizationId, userId);
  return NextResponse.json({ utilization });
}
