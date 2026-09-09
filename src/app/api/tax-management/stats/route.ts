import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TaxManagementService } from '@/lib/services/tax-management-service';

/** GET /api/tax-management/stats — tax stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { totalCount: 0, byStatus: {}, byType: {}, totalTaxAmount: 0, totalTaxableAmount: 0 } });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;

  const stats = await TaxManagementService.getStats(organizationId);
  return NextResponse.json({ stats });
}
