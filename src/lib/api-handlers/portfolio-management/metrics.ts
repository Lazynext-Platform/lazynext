import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioManagementService } from '@/lib/services/portfolio-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ metrics: { activeAccounts: 0, openHoldings: 0, pendingTransactions: 0, totalPortfolioValue: 0, activeAllocations: 0 } });
  const organizationId = workspaces[0].organizationId;
  const metrics = await PortfolioManagementService.getPortfolioManagementMetrics(organizationId);
  return NextResponse.json({ metrics });
}
