import { NextRequest, NextResponse } from 'next/server';
import { FacilitiesService } from '@/lib/services/facilities-service';
import type { LeaseStatus } from '@/lib/services/facilities-service';

/** GET /api/facilities/leases/[id] — get a lease by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const lease = await FacilitiesService.getLease(id);
  if (!lease) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ lease });
}

/** PATCH /api/facilities/leases/[id] — update a lease */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const lease = await FacilitiesService.updateLease(id, {
      landlord: body.landlord,
      startDate: body.startDate,
      endDate: body.endDate,
      monthlyRent: body.monthlyRent,
      deposit: body.deposit,
      terms: body.terms,
      status: body.status as LeaseStatus | undefined,
    });
    if (!lease) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ lease });
  } catch (e) {
    console.error('[facilities/leases] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_lease' }, { status: 500 });
  }
}
