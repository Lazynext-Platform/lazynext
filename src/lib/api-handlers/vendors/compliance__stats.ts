import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorComplianceService } from '@/lib/services/vendor-compliance-service';

/** GET /api/vendors/compliance/stats — get compliance stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      stats: {
        totalRecords: 0,
        byType: { insurance: 0, certification: 0, security: 0, regulatory: 0, contractual: 0 },
        byStatus: { compliant: 0, non_compliant: 0, pending: 0, expired: 0 },
        nonCompliantCount: 0,
      },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await VendorComplianceService.getStats(organizationId);

  return NextResponse.json({ stats });
}
