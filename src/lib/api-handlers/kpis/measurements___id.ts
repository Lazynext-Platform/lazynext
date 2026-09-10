import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KpiService } from '@/lib/services/kpi-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const measurement = await KpiService.getKpiMeasurement(id);
  if (!measurement) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ measurement });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const measurement = await KpiService.updateKpiMeasurement(id, body);
    if (!measurement) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ measurement });
  } catch (e) {
    console.error('[kpis/measurements] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_measurement' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await KpiService.deleteKpiMeasurement(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
