import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { IPService } from '@/lib/services/ip-service';

/** GET /api/ip/stats — get IP stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { assetCount: 0, licenseCount: 0, disputeCount: 0, trademarkCount: 0, tradeSecretCount: 0, activeLicenseCount: 0, pendingDisputeCount: 0, portfolioValue: 0, royaltyIncome: 0, byAssetType: {}, byAssetStatus: {}, byDisputeStatus: {} } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await IPService.getStats(organizationId);
  return NextResponse.json({ stats });
}
