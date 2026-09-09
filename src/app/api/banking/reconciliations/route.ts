import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BankingService } from '@/lib/services/banking-service';

/** GET /api/banking/reconciliations — list reconciliations */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ reconciliations: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { accountId?: string; status?: string; period?: string } = {};
  const accountId = url.searchParams.get('accountId');
  const status = url.searchParams.get('status');
  const period = url.searchParams.get('period');
  if (accountId) opts.accountId = accountId;
  if (status) opts.status = status;
  if (period) opts.period = period;

  const reconciliations = await BankingService.listReconciliations(organizationId, opts as never);
  return NextResponse.json({ reconciliations });
}

/** POST /api/banking/reconciliations — create a reconciliation */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const accountId = String(body.accountId || '').trim();
  const period = String(body.period || '').trim();
  const statementBalance = Number(body.statementBalance);
  if (!accountId || !period || isNaN(statementBalance)) {
    return NextResponse.json({ error: 'account_period_balance_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const reconciliation = await BankingService.createReconciliation(
      ws.organizationId, ws.id,
      {
        accountId, period, statementBalance,
        bookBalance: body.bookBalance, status: body.status, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ reconciliation }, { status: 201 });
  } catch (e) {
    console.error('[banking/reconciliations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_reconciliation' }, { status: 500 });
  }
}
