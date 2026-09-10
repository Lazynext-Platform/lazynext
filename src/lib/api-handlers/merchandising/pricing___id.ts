import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MerchandisingService } from '@/lib/services/merchandising-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const pricing = await MerchandisingService.getPricing(id);
  if (!pricing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ pricing });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const pricing = await MerchandisingService.updatePricing(id, body);
    if (!pricing) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ pricing });
  } catch (e) {
    console.error('[merchandising/pricing] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_pricing' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await MerchandisingService.deletePricing(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
