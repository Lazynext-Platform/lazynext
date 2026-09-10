import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FoodServicesService } from '@/lib/services/food-services-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const item = await FoodServicesService.getInventory(id);
  if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const item = await FoodServicesService.updateInventory(id, body);
    if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('[food-services/inventory] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_inventory' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await FoodServicesService.deleteInventory(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
