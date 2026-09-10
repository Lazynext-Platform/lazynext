import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { FacilitiesService } from '@/lib/services/facilities-service';
import type { LeaseStatus } from '@/lib/services/facilities-service';

/** GET /api/facilities/leases — list leases */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const leases = await FacilitiesService.listLeases(organizationId, {
    facilityId: sp.get('facilityId') || undefined,
    status: (sp.get('status') as LeaseStatus) || undefined,
  });

  return NextResponse.json({ leases });
}

/** POST /api/facilities/leases — create a lease */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const facilityId = String(body.facilityId || '').trim();
  const landlord = String(body.landlord || '').trim();
  const startDate = String(body.startDate || '').trim();
  const endDate = String(body.endDate || '').trim();
  if (!facilityId || !landlord || !startDate || !endDate) {
    return NextResponse.json({ error: 'facility_landlord_dates_required' }, { status: 400 });
  }

  try {
    const lease = await FacilitiesService.createLease(
      organizationId,
      body.workspaceId || organizationId,
      {
        facilityId,
        landlord,
        startDate,
        endDate,
        monthlyRent: body.monthlyRent,
        deposit: body.deposit,
        terms: body.terms,
        status: body.status as LeaseStatus | undefined,
      },
      userId,
    );
    return NextResponse.json({ lease }, { status: 201 });
  } catch (e) {
    console.error('[facilities/leases] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_lease' }, { status: 500 });
  }
}
