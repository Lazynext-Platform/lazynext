import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LeaseManagementService } from '@/lib/services/lease-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ payments: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['contractId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const payments = await LeaseManagementService.listPayments(organizationId, opts as never);
  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const contractId = String(body.contractId || '').trim();
  const type = String(body.type || '').trim();
  const amount = Number(body.amount);
  if (!contractId || !type || !Number.isFinite(amount)) return NextResponse.json({ error: 'contractId_type_amount_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const payment = await LeaseManagementService.createPayment(ws.organizationId, ws.id, {
      contractId, type: type as never, amount,
      currency: body.currency, status: body.status,
      dueDate: body.dueDate, paidDate: body.paidDate,
      method: body.method, reference: body.reference, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (e) {
    console.error('[lease-management/payments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_payment' }, { status: 500 });
  }
}
