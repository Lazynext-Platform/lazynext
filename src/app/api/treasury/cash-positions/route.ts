import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TreasuryService } from '@/lib/services/treasury-service';

/** GET /api/treasury/cash-positions — list cash positions (query: organizationId, accountId, fromDate, toDate) */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ cashPositions: [] });
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

  const cashPositions = await TreasuryService.getCashPositions(organizationId, opts);
  return NextResponse.json({ cashPositions });
}

/** POST /api/treasury/cash-positions — record a cash position snapshot */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim() || workspaces[0].organizationId;
  const workspaceId = body.workspaceId?.trim() || workspaces[0].id;
  if (!body.accountId || body.balance === undefined || !body.date) {
    return NextResponse.json({ error: 'accountId_balance_date_required' }, { status: 400 });
  }

  try {
    const cashPosition = await TreasuryService.recordCashPosition(
      organizationId,
      workspaceId,
      {
        accountId: body.accountId,
        balance: Number(body.balance),
        date: body.date,
        notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ cashPosition }, { status: 201 });
  } catch (e) {
    console.error('[treasury/cash-positions] create error:', e);
    return NextResponse.json({ error: 'failed_to_record_cash_position' }, { status: 500 });
  }
}
