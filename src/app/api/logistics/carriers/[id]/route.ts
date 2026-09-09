import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LogisticsService } from '@/lib/services/logistics-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const carrier = await LogisticsService.getCarrier(id);
  if (!carrier) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ carrier });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const carrier = await LogisticsService.updateCarrier(id, body);
    if (!carrier) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ carrier });
  } catch (e) {
    console.error('[logistics/carriers] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_carrier' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await LogisticsService.deleteCarrier(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
