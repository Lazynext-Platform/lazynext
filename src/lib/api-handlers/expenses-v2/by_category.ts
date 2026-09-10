import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ExpenseServiceV2 } from '@/lib/services/expense-service-v2';

/** GET /api/expenses-v2/by-category — expenses grouped by category */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ byCategory: {} });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { dateStart?: Date; dateEnd?: Date } = {};
  const dateStart = url.searchParams.get('dateStart');
  const dateEnd = url.searchParams.get('dateEnd');
  if (dateStart) opts.dateStart = new Date(dateStart);
  if (dateEnd) opts.dateEnd = new Date(dateEnd);

  const byCategory = await ExpenseServiceV2.getByCategory(organizationId, opts);
  return NextResponse.json({ byCategory });
}
