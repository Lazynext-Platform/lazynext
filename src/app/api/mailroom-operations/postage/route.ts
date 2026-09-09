import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MailroomOperationsService } from '@/lib/services/mailroom-operations-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ postage: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['itemId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const postage = await MailroomOperationsService.listPostage(organizationId, opts as never);
  return NextResponse.json({ postage });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId || '').trim();
  const type = String(body.type || '').trim();
  const amount = Number(body.amount);
  if (!itemId || !type || !Number.isFinite(amount)) return NextResponse.json({ error: 'itemId_type_amount_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const postage = await MailroomOperationsService.createPostage(ws.organizationId, ws.id, {
      itemId, type: type as never, amount,
      currency: body.currency, description: body.description, status: body.status,
      date: body.date, meterNumber: body.meterNumber, permitNumber: body.permitNumber, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ postage }, { status: 201 });
  } catch (e) {
    console.error('[mailroom-operations/postage] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_postage' }, { status: 500 });
  }
}
