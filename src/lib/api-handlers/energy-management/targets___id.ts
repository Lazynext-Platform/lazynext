import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EnergyManagementService } from '@/lib/services/energy-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const target = await EnergyManagementService.getEfficiencyTarget(id);
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ target });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const target = await EnergyManagementService.updateEfficiencyTarget(id, body);
    if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ target });
  } catch (e) {
    console.error('[energy-management/targets] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_target' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await EnergyManagementService.deleteEfficiencyTarget(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
