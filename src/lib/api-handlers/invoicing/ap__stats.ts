import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { APService } from '@/lib/services/ap-service';

/** GET /api/invoicing/ap/stats — get AP stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      totalPayables: 0,
      payableCount: 0,
      byCategory: {},
      avgDaysToPay: 0,
      pendingApprovalCount: 0,
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await APService.getStats(organizationId);
  return NextResponse.json(stats);
}
