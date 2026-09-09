import { NextRequest, NextResponse } from 'next/server';
import { FacilitiesService } from '@/lib/services/facilities-service';
import type { FacilityType } from '@/lib/services/facilities-service';

/** GET /api/facilities/[id] — get a facility by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const facility = await FacilitiesService.getFacility(id);
  if (!facility) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ facility });
}

/** PATCH /api/facilities/[id] — update a facility */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const facility = await FacilitiesService.updateFacility(id, {
      name: body.name,
      address: body.address,
      type: body.type as FacilityType | undefined,
      floors: body.floors,
      totalArea: body.totalArea,
      areaUnit: body.areaUnit,
      description: body.description,
      isActive: body.isActive,
    });
    if (!facility) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ facility });
  } catch (e) {
    console.error('[facilities] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_facility' }, { status: 500 });
  }
}

/** DELETE /api/facilities/[id] — delete a facility */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await FacilitiesService.deleteFacility(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
