import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { InvestorRelationsService } from '@/lib/services/investor-relations-service';

/** GET /api/investor-relations/stats — get IR stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { investorCount: 0, fundingRoundCount: 0, capTableEntryCount: 0, communicationCount: 0, updateCount: 0, totalRaised: 0, totalTarget: 0, activeInvestorCount: 0, byInvestorType: {}, byFundingRoundStatus: {} } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await InvestorRelationsService.getStats(organizationId);
  return NextResponse.json({ stats });
}
