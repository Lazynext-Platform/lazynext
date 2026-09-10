import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RndService } from '@/lib/services/rnd-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ patents: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const patents = await RndService.listPatents(organizationId, opts as never);
  return NextResponse.json({ patents });
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
    const patent = await RndService.createPatent(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, status: body.status,
      applicationNumber: body.applicationNumber, filingDate: body.filingDate, grantDate: body.grantDate,
      inventor: body.inventor, assignee: body.assignee, claims: body.claims, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ patent }, { status: 201 });
  } catch (e) {
    console.error('[rnd/patents] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_patent' }, { status: 500 });
  }
}
