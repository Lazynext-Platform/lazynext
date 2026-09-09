import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { TravelService } from '@/lib/services/travel-service';
import type { BookingType, BookingStatus } from '@/lib/services/travel-service';

/** GET /api/travel/requests/[id]/bookings — list bookings */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookings = await TravelService.getBookings(id);
  return NextResponse.json({ bookings });
}

/** POST /api/travel/requests/[id]/bookings — add a booking */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim() as BookingType;
  const vendor = String(body.vendor || '').trim();
  const cost = Number(body.cost);
  if (!type || !vendor || Number.isNaN(cost)) {
    return NextResponse.json({ error: 'type_vendor_cost_required' }, { status: 400 });
  }

  try {
    const booking = await TravelService.addBooking(
      id,
      organizationId,
      body.workspaceId || organizationId,
      {
        type,
        vendor,
        confirmationNumber: body.confirmationNumber,
        cost,
        bookingDate: body.bookingDate ? new Date(body.bookingDate) : undefined,
        status: body.status as BookingStatus | undefined,
      },
      userId,
    );
    return NextResponse.json({ booking }, { status: 201 });
  } catch (e) {
    console.error('[travel/bookings] create error:', e);
    return NextResponse.json({ error: 'failed_to_add_booking' }, { status: 500 });
  }
}
