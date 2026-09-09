import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateHousingService } from '@/lib/services/corporate-housing-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ maintenance: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['propertyId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const maintenance = await CorporateHousingService.listMaintenance(organizationId, opts as never);
  return NextResponse.json({ maintenance });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const propertyId = String(body.propertyId || '').trim();
  const type = String(body.type || '').trim();
  if (!propertyId || !type) return NextResponse.json({ error: 'propertyId_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const maintenance = await CorporateHousingService.createMaintenance(ws.organizationId, ws.id, {
      propertyId, type: type as never,
      description: body.description, status: body.status, priority: body.priority,
      requestedDate: body.requestedDate, scheduledDate: body.scheduledDate, completedDate: body.completedDate,
      assignedTo: body.assignedTo, cost: body.cost, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ maintenance }, { status: 201 });
  } catch (e) {
    console.error('[corporate-housing/maintenance] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_maintenance' }, { status: 500 });
  }
}
