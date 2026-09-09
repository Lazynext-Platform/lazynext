import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FieldServiceService } from '@/lib/services/field-service-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const order = await FieldServiceService.getOrder(id);
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const order = await FieldServiceService.updateOrder(id, body);
    if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ order });
  } catch (e) {
    console.error('[field-service/orders] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_order' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await FieldServiceService.deleteOrder(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
