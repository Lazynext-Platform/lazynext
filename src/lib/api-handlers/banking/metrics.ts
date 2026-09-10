import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BankingService } from '@/lib/services/banking-service';

/** GET /api/banking/metrics — get banking metrics */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ metrics: { totalBalance: 0, pendingTransactions: 0, outstandingWires: 0, reconciliationStatus: {} } });
  }

  const organizationId = workspaces[0].organizationId;
  const metrics = await BankingService.getBankingMetrics(organizationId);
  return NextResponse.json({ metrics });
}
