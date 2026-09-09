import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MerchandisingService } from '@/lib/services/merchandising-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const assortment = await MerchandisingService.getAssortment(id);
  if (!assortment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ assortment });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const assortment = await MerchandisingService.updateAssortment(id, body);
    if (!assortment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ assortment });
  } catch (e) {
    console.error('[merchandising/assortments] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_assortment' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await MerchandisingService.deleteAssortment(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
