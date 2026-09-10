import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EngineeringManagementService } from '@/lib/services/engineering-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ healths: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['category', 'status', 'team']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const healths = await EngineeringManagementService.listHealths(organizationId, opts as never);
  return NextResponse.json({ healths });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const category = String(body.category || '').trim();
  const status = String(body.status || '').trim();
  const score = Number(body.score);
  if (!category || !status || isNaN(score)) return NextResponse.json({ error: 'category_status_score_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const health = await EngineeringManagementService.createHealth(ws.organizationId, ws.id, {
      category: category as never, status: status as never, score,
      description: body.description, team: body.team, measuredDate: body.measuredDate,
      trend: body.trend, factors: body.factors, recommendations: body.recommendations,
      actionItems: body.actionItems, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ health }, { status: 201 });
  } catch (e) {
    console.error('[engineering-management/health] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_health' }, { status: 500 });
  }
}
