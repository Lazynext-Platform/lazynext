import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataWarehouseService } from '@/lib/services/data-warehouse-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ pipelines: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const pipelines = await DataWarehouseService.listPipelines(organizationId, opts as never);
  return NextResponse.json({ pipelines });
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
    const pipeline = await DataWarehouseService.createPipeline(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, sourceSystem: body.sourceSystem, targetSystem: body.targetSystem,
      status: body.status, schedule: body.schedule, owner: body.owner,
      lastRun: body.lastRun, lastStatus: body.lastStatus, recordsProcessed: body.recordsProcessed, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ pipeline }, { status: 201 });
  } catch (e) {
    console.error('[data-warehouse/pipelines] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_pipeline' }, { status: 500 });
  }
}
