import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KpiService } from '@/lib/services/kpi-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const definition = await KpiService.getKpiDefinition(id);
  if (!definition) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ definition });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const definition = await KpiService.updateKpiDefinition(id, body);
    if (!definition) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ definition });
  } catch (e) {
    console.error('[kpis/definitions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_definition' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await KpiService.deleteKpiDefinition(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
