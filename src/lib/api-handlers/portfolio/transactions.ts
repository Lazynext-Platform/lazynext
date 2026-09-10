import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioService } from '@/lib/services/portfolio-service';

/** GET /api/portfolio/transactions — list portfolio transactions */
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
  const opts: { holdingId?: string; type?: string; dateFrom?: string; dateTo?: string } = {};
  const holdingId = url.searchParams.get('holdingId');
  const type = url.searchParams.get('type');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  if (holdingId) opts.holdingId = holdingId;
  if (type) opts.type = type;
  if (dateFrom) opts.dateFrom = dateFrom;
  if (dateTo) opts.dateTo = dateTo;

  const transactions = await PortfolioService.listTransactions(organizationId, opts as never);
  return NextResponse.json({ transactions });
}

/** POST /api/portfolio/transactions — create a portfolio transaction */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim();
  const amount = Number(body.amount);
  const date = String(body.date || '').trim();
  if (!type || !amount || !date) {
    return NextResponse.json({ error: 'type_amount_date_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const transaction = await PortfolioService.createTransaction(
      ws.organizationId, ws.id,
      {
        type: type as never, amount, transactionDate: date,
        holdingId: body.holdingId, quantity: body.quantity, price: body.price,
        currency: body.currency, fees: body.fees, notes: body.notes,
      },
      session.user.id,
    );
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (e) {
    console.error('[portfolio/transactions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_transaction' }, { status: 500 });
  }
}
