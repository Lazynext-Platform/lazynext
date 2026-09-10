import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InsuranceService } from '@/lib/services/insurance-service';

/** GET /api/insurance/expiring — list expiring policies (query: organizationId, daysAhead) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ policies: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const daysAhead = sp.get('daysAhead') ? Number(sp.get('daysAhead')) : 90;

  const policies = await InsuranceService.getExpiringPolicies(organizationId, daysAhead);
  return NextResponse.json({ policies });
}
