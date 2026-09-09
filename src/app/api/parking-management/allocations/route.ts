import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ParkingManagementService } from '@/lib/services/parking-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ allocations: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['spotId', 'permitId', 'type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const allocations = await ParkingManagementService.listAllocations(organizationId, opts as never);
  return NextResponse.json({ allocations });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const spotId = String(body.spotId || '').trim();
  const type = String(body.type || '').trim();
  if (!spotId || !type) return NextResponse.json({ error: 'spotid_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const allocation = await ParkingManagementService.createAllocation(ws.organizationId, ws.id, {
      spotId, type: type as never,
      permitId: body.permitId, description: body.description, status: body.status,
      assignee: body.assignee, department: body.department,
      assignedDate: body.assignedDate, releasedDate: body.releasedDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ allocation }, { status: 201 });
  } catch (e) {
    console.error('[parking-management/allocations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_allocation' }, { status: 500 });
  }
}
