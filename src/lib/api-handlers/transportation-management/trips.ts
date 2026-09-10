import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TransportationManagementService } from '@/lib/services/transportation-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ trips: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const trips = await TransportationManagementService.listTrips(organizationId, opts as never);
  return NextResponse.json({ trips });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const routeId = String(body.routeId || '').trim();
  const type = String(body.type || '').trim();
  if (!routeId || !type) return NextResponse.json({ error: 'route_id_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const trip = await TransportationManagementService.createTrip(ws.organizationId, ws.id, {
      routeId, type: type as never,
      description: body.description, status: body.status,
      vehicleId: body.vehicleId, assignmentId: body.assignmentId,
      driverName: body.driverName, passengerCount: body.passengerCount,
      scheduledDate: body.scheduledDate, startDate: body.startDate,
      completedDate: body.completedDate, origin: body.origin,
      destination: body.destination, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ trip }, { status: 201 });
  } catch (e) {
    console.error('[transportation-management/trips] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_trip' }, { status: 500 });
  }
}
