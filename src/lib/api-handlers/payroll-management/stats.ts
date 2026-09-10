import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PayrollManagementService } from '@/lib/services/payroll-management-service';

/** GET /api/payroll-management/stats — payroll stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ total: 0, byStatus: {}, totalGross: 0, totalNet: 0 });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;

  try {
    const stats = await PayrollManagementService.getStats(organizationId);
    return NextResponse.json(stats);
  } catch (e) {
    console.error('[payroll-management/stats] error:', e);
    return NextResponse.json({ error: 'failed_to_get_stats' }, { status: 500 });
  }
}
