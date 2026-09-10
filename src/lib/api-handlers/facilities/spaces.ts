import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { FacilitiesService } from '@/lib/services/facilities-service';

/** GET /api/facilities/spaces — list space allocations */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const allocations = await FacilitiesService.getSpaceAllocations(organizationId, {
    facilityId: sp.get('facilityId') || undefined,
    department: sp.get('department') || undefined,
  });

  return NextResponse.json({ allocations });
}

/** POST /api/facilities/spaces — create a space allocation */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const facilityId = String(body.facilityId || '').trim();
  if (!facilityId) {
    return NextResponse.json({ error: 'facilityId_required' }, { status: 400 });
  }

  try {
    const allocation = await FacilitiesService.createSpaceAllocation(
      organizationId,
      body.workspaceId || organizationId,
      {
        facilityId,
        floor: body.floor,
        area: body.area,
        assignedTo: body.assignedTo,
        department: body.department,
        purpose: body.purpose,
        startDate: body.startDate,
      },
      userId,
    );
    return NextResponse.json({ allocation }, { status: 201 });
  } catch (e) {
    console.error('[facilities/spaces] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_space_allocation' }, { status: 500 });
  }
}
