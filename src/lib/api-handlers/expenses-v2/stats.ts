import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ExpenseServiceV2 } from '@/lib/services/expense-service-v2';

/** GET /api/expenses-v2/stats — expense stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { total: 0, byCategory: {}, byStatus: {}, totalAmount: 0, pendingAmount: 0, approvedAmount: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await ExpenseServiceV2.getStats(organizationId);
  return NextResponse.json({ stats });
}
