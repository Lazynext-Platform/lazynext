import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TreasuryService } from '@/lib/services/treasury-service';

/** GET /api/treasury/cash-flow-summary — cash flow summary (query: organizationId, fromDate, toDate) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ totalInflows: 0, totalOutflows: 0, net: 0 });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { fromDate?: Date; toDate?: Date } = {};
  const fromDate = sp.get('fromDate');
  const toDate = sp.get('toDate');
  if (fromDate) opts.fromDate = new Date(fromDate);
  if (toDate) opts.toDate = new Date(toDate);

  const summary = await TreasuryService.getCashFlowSummary(organizationId, opts);
  return NextResponse.json(summary);
}
