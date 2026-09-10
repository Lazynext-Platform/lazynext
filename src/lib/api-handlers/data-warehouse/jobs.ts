import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataWarehouseService } from '@/lib/services/data-warehouse-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ jobs: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['pipelineId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const jobs = await DataWarehouseService.listJobs(organizationId, opts as never);
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const pipelineId = String(body.pipelineId || '').trim();
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  if (!pipelineId || !name || !type) return NextResponse.json({ error: 'pipelineId_name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const job = await DataWarehouseService.createJob(ws.organizationId, ws.id, {
      pipelineId, name, type: type as never,
      description: body.description, status: body.status,
      startDate: body.startDate, endDate: body.endDate, duration: body.duration,
      recordsIn: body.recordsIn, recordsOut: body.recordsOut, errorMessage: body.errorMessage,
      triggeredBy: body.triggeredBy, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ job }, { status: 201 });
  } catch (e) {
    console.error('[data-warehouse/jobs] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_job' }, { status: 500 });
  }
}
