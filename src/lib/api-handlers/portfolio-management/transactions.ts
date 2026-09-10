import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PortfolioManagementService } from '@/lib/services/portfolio-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ transactions: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['accountId', 'holdingId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const transactions = await PortfolioManagementService.listTransactions(organizationId, opts as never);
  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const accountId = String(body.accountId || '').trim();
  const type = String(body.type || '').trim();
  const amount = Number(body.amount);
  if (!accountId || !type || !Number.isFinite(amount)) return NextResponse.json({ error: 'accountId_type_amount_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const transaction = await PortfolioManagementService.createTransaction(ws.organizationId, ws.id, {
      accountId, type: type as never, amount,
      holdingId: body.holdingId, currency: body.currency, description: body.description,
      status: body.status, executionDate: body.executionDate, settlementDate: body.settlementDate,
      quantity: body.quantity, price: body.price, fees: body.fees, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (e) {
    console.error('[portfolio-management/transactions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_transaction' }, { status: 500 });
  }
}
