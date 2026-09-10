import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MerchandisingService } from '@/lib/services/merchandising-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const promotion = await MerchandisingService.getPromotion(id);
  if (!promotion) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ promotion });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const promotion = await MerchandisingService.updatePromotion(id, body);
    if (!promotion) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ promotion });
  } catch (e) {
    console.error('[merchandising/promotions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_promotion' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await MerchandisingService.deletePromotion(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
