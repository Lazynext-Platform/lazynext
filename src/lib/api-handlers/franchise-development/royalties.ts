import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FranchiseDevelopmentService } from '@/lib/services/franchise-development-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ royalties: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['unitId', 'agreementId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const royalties = await FranchiseDevelopmentService.listRoyalties(organizationId, opts as never);
  return NextResponse.json({ royalties });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const unitId = String(body.unitId || '').trim();
  const agreementId = String(body.agreementId || '').trim();
  const type = String(body.type || '').trim();
  const amount = typeof body.amount === 'number' ? body.amount : parseFloat(body.amount);
  if (!unitId || !agreementId || !type || !amount) return NextResponse.json({ error: 'unitId_agreementId_type_amount_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const royalty = await FranchiseDevelopmentService.createRoyalty(ws.organizationId, ws.id, {
      unitId, agreementId, type: type as never, amount,
      currency: body.currency, description: body.description, status: body.status,
      period: body.period, dueDate: body.dueDate, paidDate: body.paidDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ royalty }, { status: 201 });
  } catch (e) {
    console.error('[franchise-development/royalties] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_royalty' }, { status: 500 });
  }
}
