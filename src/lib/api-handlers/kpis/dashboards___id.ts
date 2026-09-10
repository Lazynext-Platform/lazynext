import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KpiService } from '@/lib/services/kpi-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const dashboard = await KpiService.getKpiDashboard(id);
  if (!dashboard) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ dashboard });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const dashboard = await KpiService.updateKpiDashboard(id, body);
    if (!dashboard) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ dashboard });
  } catch (e) {
    console.error('[kpis/dashboards] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_dashboard' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await KpiService.deleteKpiDashboard(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
