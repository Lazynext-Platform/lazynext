import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AirQualityManagementService } from '@/lib/services/air-quality-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const reading = await AirQualityManagementService.getAirReading(id);
  if (!reading) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ reading });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const reading = await AirQualityManagementService.updateAirReading(id, body);
    if (!reading) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ reading });
  } catch (e) {
    console.error('[air-quality-management/readings] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_reading' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await AirQualityManagementService.deleteAirReading(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
