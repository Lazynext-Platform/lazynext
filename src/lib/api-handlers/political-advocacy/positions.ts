import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PoliticalAdvocacyService } from '@/lib/services/political-advocacy-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ positions: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'issueArea', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const positions = await PoliticalAdvocacyService.listPositions(organizationId, opts as never);
  return NextResponse.json({ positions });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  const issueArea = String(body.issueArea || '').trim();
  if (!title || !type || !issueArea) return NextResponse.json({ error: 'title_type_issueArea_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const position = await PoliticalAdvocacyService.createPosition(ws.organizationId, ws.id, {
      title, type: type as never, issueArea: issueArea as never,
      description: body.description, status: body.status,
      billNumber: body.billNumber, summary: body.summary,
      rationale: body.rationale, recommendations: body.recommendations,
      publishedDate: body.publishedDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ position }, { status: 201 });
  } catch (e) {
    console.error('[political-advocacy/positions] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_position' }, { status: 500 });
  }
}
