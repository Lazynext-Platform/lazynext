import { NextRequest, NextResponse } from 'next/server';
import { FacilitiesService } from '@/lib/services/facilities-service';

/** PATCH /api/facilities/spaces/[id] — update a space allocation */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const allocation = await FacilitiesService.updateSpaceAllocation(id, {
      floor: body.floor,
      area: body.area,
      assignedTo: body.assignedTo,
      department: body.department,
      purpose: body.purpose,
    });
    if (!allocation) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ allocation });
  } catch (e) {
    console.error('[facilities/spaces] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_space_allocation' }, { status: 500 });
  }
}

/** DELETE /api/facilities/spaces/[id] — delete a space allocation */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await FacilitiesService.deleteSpaceAllocation(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
