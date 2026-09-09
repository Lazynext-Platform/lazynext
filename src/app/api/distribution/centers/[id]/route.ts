import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DistributionService } from '@/lib/services/distribution-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const center = await DistributionService.getCenter(id);
  if (!center) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ center });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const center = await DistributionService.updateCenter(id, body);
    if (!center) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ center });
  } catch (e) {
    console.error('[distribution/centers] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_center' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await DistributionService.deleteCenter(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
