import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioService } from '@/lib/services/portfolio-service';

/** GET /api/portfolio/metrics — get portfolio metrics */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ metrics: { totalValue: 0, totalCost: 0, totalGainLoss: 0, totalGainLossPercent: 0, activeHoldings: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const metrics = await PortfolioService.getPortfolioMetrics(organizationId);
  return NextResponse.json({ metrics });
}
