import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WaterManagementService } from '@/lib/services/water-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const test = await WaterManagementService.getWaterQualityTest(id);
  if (!test) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ test });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const test = await WaterManagementService.updateWaterQualityTest(id, body);
    if (!test) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ test });
  } catch (e) {
    console.error('[water-management/quality-tests] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_test' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await WaterManagementService.deleteWaterQualityTest(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
