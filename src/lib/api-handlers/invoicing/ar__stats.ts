import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ARService } from '@/lib/services/ar-service';

/** GET /api/invoicing/ar/stats — get AR stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      totalReceivables: 0,
      totalOverdue: 0,
      collectionRate: 0,
      avgDaysToPay: 0,
      invoiceCount: 0,
      overdueCount: 0,
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await ARService.getStats(organizationId);
  return NextResponse.json(stats);
}
