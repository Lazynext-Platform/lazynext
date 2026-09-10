import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EnvironmentalComplianceService } from '@/lib/services/environmental-compliance-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const waste = await EnvironmentalComplianceService.getWaste(id);
  if (!waste) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ waste });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const waste = await EnvironmentalComplianceService.updateWaste(id, body);
    if (!waste) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ waste });
  } catch (e) {
    console.error('[environmental-compliance/wastes] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_waste' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await EnvironmentalComplianceService.deleteWaste(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
