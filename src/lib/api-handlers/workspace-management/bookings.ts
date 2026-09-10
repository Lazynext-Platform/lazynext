import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { WorkspaceManagementService } from '@/lib/services/workspace-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ bookings: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const bookings = await WorkspaceManagementService.listBookings(organizationId, opts as never);
  return NextResponse.json({ bookings });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const deskId = String(body.deskId || '').trim();
  const type = String(body.type || '').trim();
  if (!deskId || !type) return NextResponse.json({ error: 'deskId_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const booking = await WorkspaceManagementService.createBooking(ws.organizationId, ws.id, {
      deskId, type: type as never,
      description: body.description, status: body.status,
      bookedBy: body.bookedBy, department: body.department,
      startDate: body.startDate, endDate: body.endDate,
      checkInDate: body.checkInDate, checkOutDate: body.checkOutDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (e) {
    console.error('[workspace-management/bookings] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_booking' }, { status: 500 });
  }
}
