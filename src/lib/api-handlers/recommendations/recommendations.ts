import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { RecommendationService } from '@/lib/services/recommendation-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ recommendations: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const recommendations = await RecommendationService.listRecommendations(organizationId, opts as never);
  return NextResponse.json({ recommendations });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!name || !type) return NextResponse.json({ error: 'name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const recommendation = await RecommendationService.createRecommendation(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description,
      status: body.status,
      category: body.category,
      priority: body.priority,
      confidence: body.confidence,
      reasoning: body.reasoning,
      source: body.source,
      target: body.target,
      targetId: body.targetId,
      expectedImpact: body.expectedImpact,
      actualImpact: body.actualImpact,
      generatedAt: body.generatedAt,
      actedAt: body.actedAt,
      notes: body.notes
    }, session.user.id);
    return NextResponse.json({ recommendation }, { status: 201 });
  } catch (e) {
    console.error('[recommendations/recommendations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_recommendation' }, { status: 500 });
  }
}
