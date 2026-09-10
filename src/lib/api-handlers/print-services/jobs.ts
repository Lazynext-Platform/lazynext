import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PrintServicesService } from '@/lib/services/print-services-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ jobs: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const jobs = await PrintServicesService.listJobs(organizationId, opts as never);
  return NextResponse.json({ jobs });
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
    const job = await PrintServicesService.createJob(ws.organizationId, ws.id, {
      type: type as never,
      printerId: body.printerId, description: body.description, status: body.status,
      requester: body.requester, department: body.department, copies: body.copies,
      colorMode: body.colorMode, duplex: body.duplex, paperSize: body.paperSize,
      submittedDate: body.submittedDate, completedDate: body.completedDate,
      cost: body.cost, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ job }, { status: 201 });
  } catch (e) {
    console.error('[print-services/jobs] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_job' }, { status: 500 });
  }
}
