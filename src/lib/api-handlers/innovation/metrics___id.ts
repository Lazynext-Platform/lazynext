import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { InnovationService } from '@/lib/services/innovation-service';

/** GET /api/innovation/metrics/[id] — get a single metric */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const metric = await InnovationService.getMetric(id);
  if (!metric) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ metric });
}

/** PATCH /api/innovation/metrics/[id] — update a metric */
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
    const metric = await InnovationService.updateMetric(id, {
      name: body.name, category: body.category, value: body.value, unit: body.unit,
      period: body.period, target: body.target, previousValue: body.previousValue, trend: body.trend,
    });
    if (!metric) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ metric });
  } catch (e) {
    console.error('[innovation/metrics] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_metric' }, { status: 500 });
  }
}

/** DELETE /api/innovation/metrics/[id] — delete a metric */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const ok = await InnovationService.deleteMetric(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[innovation/metrics] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_metric' }, { status: 500 });
  }
}
