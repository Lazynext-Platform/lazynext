import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GiftManagementService } from '@/lib/services/gift-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const inventory = await GiftManagementService.getInventory(id);
  if (!inventory) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ inventory });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const inventory = await GiftManagementService.updateInventory(id, body);
    if (!inventory) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ inventory });
  } catch (e) {
    console.error('[gift-management/inventory] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_inventory' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await GiftManagementService.deleteInventory(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
