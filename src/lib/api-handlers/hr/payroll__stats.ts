import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PayrollService } from '@/lib/services/payroll-service';

/** GET /api/hr/payroll/stats — get payroll stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { total: 0, draft: 0, processed: 0, paid: 0, failed: 0, byStatus: {}, byType: {}, byPeriod: {}, totalGross: 0, totalNet: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await PayrollService.getStats(organizationId);
  return NextResponse.json({ stats });
}
