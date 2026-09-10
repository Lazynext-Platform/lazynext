import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { TravelService } from '@/lib/services/travel-service';
import type { TravelStatus, TransportMode } from '@/lib/services/travel-service';

/** GET /api/travel/requests — list travel requests */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const requests = await TravelService.listTravelRequests(organizationId, {
    status: (sp.get('status') as TravelStatus) || undefined,
    employeeId: sp.get('employeeId') || undefined,
    fromDate: sp.get('fromDate') ? new Date(sp.get('fromDate')!) : undefined,
    toDate: sp.get('toDate') ? new Date(sp.get('toDate')!) : undefined,
  });

  return NextResponse.json({ requests });
}

/** POST /api/travel/requests — create a travel request */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const employeeId = String(body.employeeId || '').trim();
  const employeeName = String(body.employeeName || '').trim();
  const destination = String(body.destination || '').trim();
  const purpose = String(body.purpose || '').trim();
  const departureDate = body.departureDate ? new Date(body.departureDate) : null;
  const returnDate = body.returnDate ? new Date(body.returnDate) : null;

  if (!employeeId || !employeeName || !destination || !purpose || !departureDate || !returnDate) {
    return NextResponse.json({ error: 'required_fields_missing' }, { status: 400 });
  }

  try {
    const request = await TravelService.createTravelRequest(
      organizationId,
      body.workspaceId || organizationId,
      {
        employeeId,
        employeeName,
        destination,
        purpose,
        departureDate,
        returnDate,
        estimatedCost: body.estimatedCost,
        transportMode: body.transportMode as TransportMode | undefined,
        notes: body.notes,
      },
      userId,
    );
    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    console.error('[travel/requests] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_travel_request' }, { status: 500 });
  }
}
