import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/targets/[id] — get a target */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const target = await SustainabilityService.getTarget(id);
  if (!target) {
    return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
  }
  return NextResponse.json({ target });
}

/** PATCH /api/sustainability/targets/[id] — update a target */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const target = await SustainabilityService.updateTarget(id, {
      metricId: body.metricId,
      name: body.name,
      category: body.category,
      baseline: body.baseline !== undefined ? Number(body.baseline) : undefined,
      target: body.target !== undefined ? Number(body.target) : undefined,
      targetDate: body.targetDate,
      current: body.current !== undefined ? Number(body.current) : undefined,
      status: body.status,
      description: body.description,
    });
    if (!target) {
      return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
    }
    return NextResponse.json({ target });
  } catch (e) {
    console.error('[sustainability/targets] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_target' }, { status: 500 });
  }
}

/** DELETE /api/sustainability/targets/[id] — delete a target */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const ok = await SustainabilityService.deleteTarget(id);
  if (!ok) {
    return NextResponse.json({ error: 'target_not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
