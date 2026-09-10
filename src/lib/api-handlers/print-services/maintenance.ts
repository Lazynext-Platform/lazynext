import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { PrintServicesService } from '@/lib/services/print-services-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ maintenance: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const maintenance = await PrintServicesService.listMaintenance(organizationId, opts as never);
  return NextResponse.json({ maintenance });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const description = String(body.description || '').trim();
  const type = String(body.type || '').trim();
  if (!description || !type) return NextResponse.json({ error: 'description_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const maintenance = await PrintServicesService.createMaintenance(ws.organizationId, ws.id, {
      type: type as never,
      printerId: body.printerId, description, status: body.status,
      scheduledDate: body.scheduledDate, startedDate: body.startedDate,
      completedDate: body.completedDate, technician: body.technician,
      cost: body.cost, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ maintenance }, { status: 201 });
  } catch (e) {
    console.error('[print-services/maintenance] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_maintenance' }, { status: 500 });
  }
}
