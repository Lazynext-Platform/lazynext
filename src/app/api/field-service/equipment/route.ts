import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FieldServiceService } from '@/lib/services/field-service-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ equipment: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const equipment = await FieldServiceService.listEquipment(organizationId, opts as never);
  return NextResponse.json({ equipment });
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
    const equipment = await FieldServiceService.createEquipment(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status, serialNumber: body.serialNumber,
      assignedTo: body.assignedTo, location: body.location,
      purchaseDate: body.purchaseDate, lastMaintenance: body.lastMaintenance,
      nextMaintenance: body.nextMaintenance, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ equipment }, { status: 201 });
  } catch (e) {
    console.error('[field-service/equipment] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_equipment' }, { status: 500 });
  }
}
