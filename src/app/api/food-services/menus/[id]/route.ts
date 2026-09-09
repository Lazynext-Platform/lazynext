import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FoodServicesService } from '@/lib/services/food-services-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const menu = await FoodServicesService.getMenu(id);
  if (!menu) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ menu });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const menu = await FoodServicesService.updateMenu(id, body);
    if (!menu) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ menu });
  } catch (e) {
    console.error('[food-services/menus] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_menu' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await FoodServicesService.deleteMenu(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
