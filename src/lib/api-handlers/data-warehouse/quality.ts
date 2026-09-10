import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataWarehouseService } from '@/lib/services/data-warehouse-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ qualities: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['modelId', 'pipelineId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const qualities = await DataWarehouseService.listQualities(organizationId, opts as never);
  return NextResponse.json({ qualities });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim();
  const status = String(body.status || '').trim();
  const score = Number(body.score);
  if (!type || !status || isNaN(score)) return NextResponse.json({ error: 'type_status_score_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const quality = await DataWarehouseService.createQuality(ws.organizationId, ws.id, {
      type: type as never, status: status as never, score,
      modelId: body.modelId, pipelineId: body.pipelineId,
      description: body.description, threshold: body.threshold,
      measuredDate: body.measuredDate, measuredBy: body.measuredBy,
      issues: body.issues, recommendations: body.recommendations, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ quality }, { status: 201 });
  } catch (e) {
    console.error('[data-warehouse/quality] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_quality' }, { status: 500 });
  }
}
