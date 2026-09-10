import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FieldServiceService } from '@/lib/services/field-service-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const equipment = await FieldServiceService.getEquipment(id);
  if (!equipment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ equipment });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const equipment = await FieldServiceService.updateEquipment(id, body);
    if (!equipment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ equipment });
  } catch (e) {
    console.error('[field-service/equipment] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_equipment' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await FieldServiceService.deleteEquipment(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
