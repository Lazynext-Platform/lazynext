import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioService } from '@/lib/services/portfolio-service';

/** GET /api/portfolio/stats — get portfolio stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { holdingCount: 0, activeHoldingCount: 0, transactionCount: 0, allocationCount: 0, riskCount: 0, byAssetClass: {}, byHoldingStatus: {}, byTransactionType: {}, byRiskLevel: {} } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await PortfolioService.getPortfolioStats(organizationId);
  return NextResponse.json({ stats });
}
