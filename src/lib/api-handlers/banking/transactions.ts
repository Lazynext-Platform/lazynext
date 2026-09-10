import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BankingService } from '@/lib/services/banking-service';

/** GET /api/banking/transactions — list transactions */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ transactions: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { accountId?: string; type?: string; status?: string; dateFrom?: string; dateTo?: string } = {};
  const accountId = url.searchParams.get('accountId');
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  if (accountId) opts.accountId = accountId;
  if (type) opts.type = type;
  if (status) opts.status = status;
  if (dateFrom) opts.dateFrom = dateFrom;
  if (dateTo) opts.dateTo = dateTo;

  const transactions = await BankingService.listTransactions(organizationId, opts as never);
  return NextResponse.json({ transactions });
}

/** POST /api/banking/transactions — create a transaction */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const accountId = String(body.accountId || '').trim();
  const type = String(body.type || '').trim();
  const amount = Number(body.amount);
  const date = String(body.date || '').trim();
  if (!accountId || !type || !date || isNaN(amount)) {
    return NextResponse.json({ error: 'account_type_amount_date_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const transaction = await BankingService.createTransaction(
      ws.organizationId, ws.id,
      {
        accountId, type: type as never, amount, date,
        description: body.description, counterparty: body.counterparty,
        reference: body.reference, status: body.status, category: body.category,
      },
      session.user.id,
    );
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (e) {
    console.error('[banking/transactions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_transaction' }, { status: 500 });
  }
}
