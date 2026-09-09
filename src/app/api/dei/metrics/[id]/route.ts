import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DeiService } from '@/lib/services/dei-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const metric = await DeiService.getMetric(id);
  if (!metric) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ metric });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const metric = await DeiService.updateMetric(id, {
      category: body.category, period: body.period, periodLabel: body.periodLabel,
      metricName: body.metricName, value: body.value, target: body.target, unit: body.unit,
      description: body.description, demographicBreakdown: body.demographicBreakdown, notes: body.notes,
    });
    if (!metric) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ metric });
  } catch (e) {
    console.error('[dei/metrics] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_metric' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await DeiService.deleteMetric(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
