import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RelocationService } from '@/lib/services/relocation-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ expenses: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['caseId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const expenses = await RelocationService.listExpenses(organizationId, opts as never);
  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const caseId = String(body.caseId || '').trim();
  const type = String(body.type || '').trim();
  const amount = Number(body.amount);
  if (!caseId || !type || !amount) return NextResponse.json({ error: 'caseId_type_amount_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const expense = await RelocationService.createExpense(ws.organizationId, ws.id, {
      caseId, type: type as never, amount,
      currency: body.currency, status: body.status,
      date: body.date, vendor: body.vendor, receipt: body.receipt,
      description: body.description, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) {
    console.error('[relocation/expenses] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_expense' }, { status: 500 });
  }
}
