import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DistributionService } from '@/lib/services/distribution-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const fulfillment = await DistributionService.getFulfillment(id);
  if (!fulfillment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ fulfillment });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const fulfillment = await DistributionService.updateFulfillment(id, body);
    if (!fulfillment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ fulfillment });
  } catch (e) {
    console.error('[distribution/fulfillment] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_fulfillment' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await DistributionService.deleteFulfillment(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
