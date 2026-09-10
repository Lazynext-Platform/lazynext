import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { OfficeServicesService } from '@/lib/services/office-services-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ printJobs: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const printJobs = await OfficeServicesService.listPrintJobs(organizationId, opts as never);
  return NextResponse.json({ printJobs });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim();
  const title = String(body.title || '').trim();
  if (!type || !title) return NextResponse.json({ error: 'type_title_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const printJob = await OfficeServicesService.createPrintJob(ws.organizationId, ws.id, {
      type: type as never, title,
      description: body.description, status: body.status, requestedBy: body.requestedBy,
      copies: body.copies, color: body.color, doubleSided: body.doubleSided,
      paperSize: body.paperSize, binding: body.binding, cost: body.cost,
      completedDate: body.completedDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ printJob }, { status: 201 });
  } catch (e) {
    console.error('[office-services/print] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_print_job' }, { status: 500 });
  }
}
