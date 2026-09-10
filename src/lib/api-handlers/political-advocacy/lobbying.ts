import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PoliticalAdvocacyService } from '@/lib/services/political-advocacy-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ lobbying: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'issueArea']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const lobbying = await PoliticalAdvocacyService.listLobbying(organizationId, opts as never);
  return NextResponse.json({ lobbying });
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
    const lobbying = await PoliticalAdvocacyService.createLobbying(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, status: body.status, issueArea: body.issueArea,
      targetOfficial: body.targetOfficial, targetBody: body.targetBody,
      lobbyist: body.lobbyist, date: body.date,
      duration: body.duration, expenses: body.expenses,
      outcome: body.outcome, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ lobbying }, { status: 201 });
  } catch (e) {
    console.error('[political-advocacy/lobbying] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_lobbying' }, { status: 500 });
  }
}
