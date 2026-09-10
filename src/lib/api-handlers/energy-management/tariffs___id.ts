import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EnergyManagementService } from '@/lib/services/energy-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const tariff = await EnergyManagementService.getEnergyTariff(id);
  if (!tariff) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ tariff });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const tariff = await EnergyManagementService.updateEnergyTariff(id, body);
    if (!tariff) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ tariff });
  } catch (e) {
    console.error('[energy-management/tariffs] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_tariff' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await EnergyManagementService.deleteEnergyTariff(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
