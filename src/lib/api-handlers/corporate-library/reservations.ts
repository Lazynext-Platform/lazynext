import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { CorporateLibraryService } from '@/lib/services/corporate-library-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ reservations: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['itemId', 'reserverId', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const reservations = await CorporateLibraryService.listReservations(organizationId, opts as never);
  return NextResponse.json({ reservations });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId || '').trim();
  const reserverId = String(body.reserverId || '').trim();
  const reserverName = String(body.reserverName || '').trim();
  if (!itemId || !reserverId || !reserverName) return NextResponse.json({ error: 'itemId_reserverId_reserverName_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const reservation = await CorporateLibraryService.createReservation(ws.organizationId, ws.id, {
      itemId, reserverId, reserverName,
      status: body.status, reservedDate: body.reservedDate, expiryDate: body.expiryDate,
      fulfilledDate: body.fulfilledDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ reservation }, { status: 201 });
  } catch (e) {
    console.error('[corporate-library/reservations] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_reservation' }, { status: 500 });
  }
}
