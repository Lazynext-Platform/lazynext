import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RndService } from '@/lib/services/rnd-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ innovations: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'stage']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const innovations = await RndService.listInnovations(organizationId, opts as never);
  return NextResponse.json({ innovations });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  if (!title || !type) return NextResponse.json({ error: 'title_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const innovation = await RndService.createInnovation(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, status: body.status, stage: body.stage,
      impact: body.impact, feasibility: body.feasibility, estimatedValue: body.estimatedValue,
      owner: body.owner, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ innovation }, { status: 201 });
  } catch (e) {
    console.error('[rnd/innovations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_innovation' }, { status: 500 });
  }
}
