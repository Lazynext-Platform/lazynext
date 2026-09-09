import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InsuranceService } from '@/lib/services/insurance-service';

/** GET /api/insurance/stats — insurance stats */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      policyCount: 0, activePolicyCount: 0, claimCount: 0, openClaimCount: 0,
      coverageCount: 0, brokerCount: 0, totalCoverage: 0, totalPremiums: 0, expiringPolicies: 0,
    });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;

  const stats = await InsuranceService.getStats(organizationId);
  return NextResponse.json(stats);
}
