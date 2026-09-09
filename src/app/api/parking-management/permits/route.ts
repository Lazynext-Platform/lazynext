import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ParkingManagementService } from '@/lib/services/parking-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ permits: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const permits = await ParkingManagementService.listPermits(organizationId, opts as never);
  return NextResponse.json({ permits });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const holderName = String(body.holderName || '').trim();
  const type = String(body.type || '').trim();
  if (!holderName || !type) return NextResponse.json({ error: 'holder_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const permit = await ParkingManagementService.createPermit(ws.organizationId, ws.id, {
      holderName, type: type as never,
      description: body.description, status: body.status,
      vehiclePlate: body.vehiclePlate, vehicleMake: body.vehicleMake, vehicleModel: body.vehicleModel,
      issuedDate: body.issuedDate, expiryDate: body.expiryDate,
      approvedBy: body.approvedBy, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ permit }, { status: 201 });
  } catch (e) {
    console.error('[parking-management/permits] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_permit' }, { status: 500 });
  }
}
