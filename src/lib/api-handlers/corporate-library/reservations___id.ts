import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CorporateLibraryService } from '@/lib/services/corporate-library-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const reservation = await CorporateLibraryService.getReservation(id);
  if (!reservation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ reservation });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const reservation = await CorporateLibraryService.updateReservation(id, body);
    if (!reservation) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ reservation });
  } catch (e) {
    console.error('[corporate-library/reservations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_reservation' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await CorporateLibraryService.deleteReservation(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
