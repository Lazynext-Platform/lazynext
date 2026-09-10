import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ParkingManagementService } from '@/lib/services/parking-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ visitorParking: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const visitorParking = await ParkingManagementService.listVisitorParking(organizationId, opts as never);
  return NextResponse.json({ visitorParking });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const visitorName = String(body.visitorName || '').trim();
  const type = String(body.type || '').trim();
  if (!visitorName || !type) return NextResponse.json({ error: 'visitorname_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const visitorParking = await ParkingManagementService.createVisitorParking(ws.organizationId, ws.id, {
      visitorName, type: type as never,
      description: body.description, status: body.status,
      host: body.host, vehiclePlate: body.vehiclePlate, spotId: body.spotId,
      checkInDate: body.checkInDate, checkOutDate: body.checkOutDate,
      expectedDuration: body.expectedDuration, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ visitorParking }, { status: 201 });
  } catch (e) {
    console.error('[parking-management/visitor-parking] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_visitor_parking' }, { status: 500 });
  }
}
