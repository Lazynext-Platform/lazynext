import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { FacilitiesService } from '@/lib/services/facilities-service';
import type { FacilityType } from '@/lib/services/facilities-service';

/** GET /api/facilities — list facilities */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const facilities = await FacilitiesService.listFacilities(organizationId, {
    type: (sp.get('type') as FacilityType) || undefined,
    isActive: sp.get('isActive') === 'true' ? true : sp.get('isActive') === 'false' ? false : undefined,
  });

  return NextResponse.json({ facilities });
}

/** POST /api/facilities — create a facility */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  try {
    const facility = await FacilitiesService.createFacility(
      organizationId,
      body.workspaceId || organizationId,
      {
        name,
        address: body.address,
        type: body.type as FacilityType | undefined,
        floors: body.floors,
        totalArea: body.totalArea,
        areaUnit: body.areaUnit,
        description: body.description,
        isActive: body.isActive,
      },
      userId,
    );
    return NextResponse.json({ facility }, { status: 201 });
  } catch (e) {
    console.error('[facilities] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_facility' }, { status: 500 });
  }
}
