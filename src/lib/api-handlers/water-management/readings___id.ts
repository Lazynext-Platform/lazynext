import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WaterManagementService } from '@/lib/services/water-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const reading = await WaterManagementService.getWaterReading(id);
  if (!reading) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ reading });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const reading = await WaterManagementService.updateWaterReading(id, body);
    if (!reading) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ reading });
  } catch (e) {
    console.error('[water-management/readings] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_reading' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await WaterManagementService.deleteWaterReading(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
