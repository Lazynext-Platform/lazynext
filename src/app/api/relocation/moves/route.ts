import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RelocationService } from '@/lib/services/relocation-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ moves: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['caseId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const moves = await RelocationService.listMoves(organizationId, opts as never);
  return NextResponse.json({ moves });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const caseId = String(body.caseId || '').trim();
  const type = String(body.type || '').trim();
  if (!caseId || !type) return NextResponse.json({ error: 'caseId_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const move = await RelocationService.createMove(ws.organizationId, ws.id, {
      caseId, type: type as never,
      description: body.description, status: body.status,
      scheduledDate: body.scheduledDate, completedDate: body.completedDate,
      originAddress: body.originAddress, destinationAddress: body.destinationAddress,
      carrier: body.carrier, trackingNumber: body.trackingNumber,
      cost: body.cost, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ move }, { status: 201 });
  } catch (e) {
    console.error('[relocation/moves] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_move' }, { status: 500 });
  }
}
