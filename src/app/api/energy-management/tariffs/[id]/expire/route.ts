import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EnergyManagementService } from '@/lib/services/energy-management-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const tariff = await EnergyManagementService.expireEnergyTariff(id, session.user.id);
  if (!tariff) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ tariff });
}
