import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CarbonManagementService } from '@/lib/services/carbon-management-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const inventory = await CarbonManagementService.getCarbonInventory(id);
  if (!inventory) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ inventory });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const inventory = await CarbonManagementService.updateCarbonInventory(id, body);
    if (!inventory) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ inventory });
  } catch (e) {
    console.error('[carbon-management/inventories] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_inventory' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await CarbonManagementService.deleteCarbonInventory(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
