import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ExpenseServiceV2 } from '@/lib/services/expense-service-v2';

/** GET /api/expenses-v2/pending — expenses pending approval */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ expenses: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const expenses = await ExpenseServiceV2.getPendingApprovals(organizationId);
  return NextResponse.json({ expenses });
}
