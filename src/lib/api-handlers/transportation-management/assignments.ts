import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TransportationManagementService } from '@/lib/services/transportation-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ assignments: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const assignments = await TransportationManagementService.listAssignments(organizationId, opts as never);
  return NextResponse.json({ assignments });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const vehicleId = String(body.vehicleId || '').trim();
  const driverName = String(body.driverName || '').trim();
  const type = String(body.type || '').trim();
  if (!vehicleId || !driverName || !type) return NextResponse.json({ error: 'vehicle_id_driver_name_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const assignment = await TransportationManagementService.createAssignment(ws.organizationId, ws.id, {
      vehicleId, driverName, type: type as never,
      description: body.description, status: body.status,
      routeId: body.routeId, driverLicense: body.driverLicense,
      startDate: body.startDate, endDate: body.endDate,
      notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (e) {
    console.error('[transportation-management/assignments] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_assignment' }, { status: 500 });
  }
}
