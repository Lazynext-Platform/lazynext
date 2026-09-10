import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { SustainabilityService } from '@/lib/services/sustainability-service';

/** GET /api/sustainability/metrics/[id] — get a metric */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const metric = await SustainabilityService.getMetric(id);
  if (!metric) {
    return NextResponse.json({ error: 'metric_not_found' }, { status: 404 });
  }
  return NextResponse.json({ metric });
}

/** PATCH /api/sustainability/metrics/[id] — update a metric */
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
    const metric = await SustainabilityService.updateMetric(id, {
      name: body.name,
      category: body.category,
      unit: body.unit,
      value: body.value !== undefined ? Number(body.value) : undefined,
      target: body.target !== undefined ? Number(body.target) : undefined,
      period: body.period,
      description: body.description,
      trend: body.trend,
    });
    if (!metric) {
      return NextResponse.json({ error: 'metric_not_found' }, { status: 404 });
    }
    return NextResponse.json({ metric });
  } catch (e) {
    console.error('[sustainability/metrics] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_metric' }, { status: 500 });
  }
}

/** DELETE /api/sustainability/metrics/[id] — delete a metric */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const ok = await SustainabilityService.deleteMetric(id);
  if (!ok) {
    return NextResponse.json({ error: 'metric_not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
