import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EngineeringManagementService } from '@/lib/services/engineering-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const metric = await EngineeringManagementService.getMetric(id);
  if (!metric) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ metric });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const metric = await EngineeringManagementService.updateMetric(id, body);
    if (!metric) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ metric });
  } catch (e) {
    console.error('[engineering-management/metrics] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_metric' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await EngineeringManagementService.deleteMetric(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
