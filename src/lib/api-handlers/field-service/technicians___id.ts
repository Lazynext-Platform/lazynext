import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FieldServiceService } from '@/lib/services/field-service-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const technician = await FieldServiceService.getTechnician(id);
  if (!technician) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ technician });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const technician = await FieldServiceService.updateTechnician(id, body);
    if (!technician) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ technician });
  } catch (e) {
    console.error('[field-service/technicians] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_technician' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await FieldServiceService.deleteTechnician(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
