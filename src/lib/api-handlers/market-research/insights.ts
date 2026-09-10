import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MarketResearchService } from '@/lib/services/market-research-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ insights: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['projectId', 'type', 'status', 'priority']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const insights = await MarketResearchService.listInsights(organizationId, opts as never);
  return NextResponse.json({ insights });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  const priority = String(body.priority || '').trim();
  if (!title || !type || !priority) return NextResponse.json({ error: 'title_type_priority_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const insight = await MarketResearchService.createInsight(ws.organizationId, ws.id, {
      projectId: body.projectId, type: type as never, priority: priority as never,
      status: body.status, title, description: body.description, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ insight }, { status: 201 });
  } catch (e) {
    console.error('[market-research/insights] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_insight' }, { status: 500 });
  }
}
