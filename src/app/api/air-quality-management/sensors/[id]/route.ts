import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AirQualityManagementService } from '@/lib/services/air-quality-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const sensor = await AirQualityManagementService.getAirSensor(id);
  if (!sensor) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ sensor });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const sensor = await AirQualityManagementService.updateAirSensor(id, body);
    if (!sensor) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ sensor });
  } catch (e) {
    console.error('[air-quality-management/sensors] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_sensor' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await AirQualityManagementService.deleteAirSensor(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
