import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CapacityService } from '@/lib/services/capacity-service';

/** GET /api/capacity/bottlenecks — list capacity bottlenecks */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ bottlenecks: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const bottlenecks = await CapacityService.getBottlenecks(organizationId);
  return NextResponse.json({ bottlenecks });
}
