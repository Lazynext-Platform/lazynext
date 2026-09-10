import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BankingService } from '@/lib/services/banking-service';

/** GET /api/banking/wires — list wire transfers */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ wires: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { fromAccountId?: string; status?: string; dateFrom?: string; dateTo?: string } = {};
  const fromAccountId = url.searchParams.get('fromAccountId');
  const status = url.searchParams.get('status');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  if (fromAccountId) opts.fromAccountId = fromAccountId;
  if (status) opts.status = status;
  if (dateFrom) opts.dateFrom = dateFrom;
  if (dateTo) opts.dateTo = dateTo;

  const wires = await BankingService.listWireTransfers(organizationId, opts as never);
  return NextResponse.json({ wires });
}

/** POST /api/banking/wires — create a wire transfer */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const fromAccountId = String(body.fromAccountId || '').trim();
  const toAccountName = String(body.toAccountName || '').trim();
  const toAccountNumber = String(body.toAccountNumber || '').trim();
  const toRoutingNumber = String(body.toRoutingNumber || '').trim();
  const toBankName = String(body.toBankName || '').trim();
  const amount = Number(body.amount);
  if (!fromAccountId || !toAccountName || !toAccountNumber || !toRoutingNumber || !toBankName || isNaN(amount)) {
    return NextResponse.json({ error: 'required_fields_missing' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const wire = await BankingService.createWireTransfer(
      ws.organizationId, ws.id,
      {
        fromAccountId, toAccountName, toAccountNumber, toRoutingNumber, toBankName, amount,
        currency: body.currency, purpose: body.purpose, recipientAddress: body.recipientAddress,
        intermediaryBank: body.intermediaryBank, status: body.status,
        initiatedDate: body.initiatedDate, valueDate: body.valueDate,
      },
      session.user.id,
    );
    return NextResponse.json({ wire }, { status: 201 });
  } catch (e) {
    console.error('[banking/wires] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_wire' }, { status: 500 });
  }
}
