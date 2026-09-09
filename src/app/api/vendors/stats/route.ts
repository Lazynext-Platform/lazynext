import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorService } from '@/lib/services/vendor-service';

/** GET /api/vendors/stats — get vendor stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      stats: {
        totalVendors: 0,
        byCategory: {},
        byStatus: { active: 0, inactive: 0, preferred: 0, blocked: 0 },
        activeContracts: 0,
        totalSpend: 0,
      },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await VendorService.getStats(organizationId);

  return NextResponse.json({ stats });
}
