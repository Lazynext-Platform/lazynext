import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorContractService } from '@/lib/services/vendor-contract-service';

/** GET /api/vendors/contracts/stats — get contract stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      stats: {
        totalContracts: 0,
        byStatus: { active: 0, expired: 0, pending: 0, terminated: 0, renewal: 0 },
        byType: { service: 0, subscription: 0, one_time: 0, master: 0, nda: 0 },
        totalValue: 0,
        expiringCount: 0,
      },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await VendorContractService.getStats(organizationId);

  return NextResponse.json({ stats });
}
