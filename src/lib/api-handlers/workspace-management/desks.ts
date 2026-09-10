import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WorkspaceManagementService } from '@/lib/services/workspace-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ desks: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const desks = await WorkspaceManagementService.listDesks(organizationId, opts as never);
  return NextResponse.json({ desks });
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
    const desk = await WorkspaceManagementService.createDesk(ws.organizationId, ws.id, {
      name, type: type as never,
      description: body.description, status: body.status,
      location: body.location, floor: body.floor, zone: body.zone,
      capacity: body.capacity, equipment: body.equipment, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ desk }, { status: 201 });
  } catch (e) {
    console.error('[workspace-management/desks] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_desk' }, { status: 500 });
  }
}
