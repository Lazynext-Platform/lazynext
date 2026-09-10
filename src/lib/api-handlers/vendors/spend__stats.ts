import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorSpendService } from '@/lib/services/vendor-spend-service';

/** GET /api/vendors/spend/stats — get spend stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      stats: { totalSpend: 0, byCategory: {}, byVendor: {}, trend: [] },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await VendorSpendService.getStats(organizationId);

  return NextResponse.json({ stats });
}
