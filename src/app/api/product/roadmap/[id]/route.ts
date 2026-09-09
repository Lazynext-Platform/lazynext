import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RoadmapService } from '@/lib/services/product-management-service';

/** GET /api/product/roadmap/[id] — get a single roadmap item */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const item = await RoadmapService.get(id);
  if (!item) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ item });
}

/** PATCH /api/product/roadmap/[id] — update a roadmap item */
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
    const item = await RoadmapService.update(id, {
      title: body.title,
      description: body.description,
      quarter: body.quarter,
      status: body.status,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      dependencies: Array.isArray(body.dependencies) ? body.dependencies : undefined,
      color: body.color,
      position: body.position,
      featureId: body.featureId,
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('[product/roadmap] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_roadmap_item' }, { status: 500 });
  }
}

/** DELETE /api/product/roadmap/[id] — delete a roadmap item */
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
    await RoadmapService.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[product/roadmap] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_roadmap_item' }, { status: 500 });
  }
}
