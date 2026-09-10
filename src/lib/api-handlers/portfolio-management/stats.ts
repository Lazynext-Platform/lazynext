import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioManagementService } from '@/lib/services/portfolio-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { accountCount: 0, activeAccountCount: 0, holdingCount: 0, openHoldingCount: 0, transactionCount: 0, pendingTransactionCount: 0, allocationCount: 0, activeAllocationCount: 0, byAccountType: {}, byAccountStatus: {}, byHoldingType: {}, byHoldingStatus: {}, byTransactionType: {}, byTransactionStatus: {}, byAllocationType: {}, byAllocationStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await PortfolioManagementService.getPortfolioManagementStats(organizationId);
  return NextResponse.json({ stats });
}
