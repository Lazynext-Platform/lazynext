import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseService } from '@/lib/services/franchise-service';

/** GET /api/franchise/stats — get franchise stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { franchiseeCount: 0, agreementCount: 0, territoryCount: 0, royaltyCount: 0, complianceCount: 0, activeFranchiseeCount: 0, signedAgreementCount: 0, assignedTerritoryCount: 0, paidRoyaltyCount: 0, openComplianceCount: 0, totalRoyaltyAmount: 0, avgRoyaltyRate: 0, byFranchiseType: {}, byAgreementStatus: {}, byComplianceSeverity: {} } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await FranchiseService.getStats(organizationId);
  return NextResponse.json({ stats });
}
