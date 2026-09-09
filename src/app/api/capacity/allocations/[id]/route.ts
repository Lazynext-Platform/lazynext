import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CapacityService } from '@/lib/services/capacity-service';

/** GET /api/capacity/allocations/[id] — get a single allocation */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const allocation = await CapacityService.get(id);
  if (!allocation) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ allocation });
}

/** PATCH /api/capacity/allocations/[id] — update an allocation */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const allocation = await CapacityService.update(id, {
      role: body.role,
      allocatedHours: body.allocatedHours,
      maxHours: body.maxHours,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      status: body.status,
      notes: body.notes,
      projectId: body.projectId,
    });
    return NextResponse.json({ allocation });
  } catch (e) {
    console.error('[capacity/allocations] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_allocation' }, { status: 500 });
  }
}

/** DELETE /api/capacity/allocations/[id] — delete an allocation */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await CapacityService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[capacity/allocations] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_allocation' }, { status: 500 });
  }
}
