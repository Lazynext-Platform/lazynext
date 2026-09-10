import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AccountingService } from '@/lib/services/accounting-service';

/** GET /api/accounting/general-ledger — general ledger lines */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ lines: [] });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || workspaces[0].organizationId;
  const opts: { accountId?: string; fromDate?: Date; toDate?: Date } = {};
  const accountId = sp.get('accountId');
  const fromDate = sp.get('fromDate');
  const toDate = sp.get('toDate');
  if (accountId) opts.accountId = accountId;
  if (fromDate) opts.fromDate = new Date(fromDate);
  if (toDate) opts.toDate = new Date(toDate);

  const lines = await AccountingService.getGeneralLedger(organizationId, opts);
  return NextResponse.json({ lines });
}
