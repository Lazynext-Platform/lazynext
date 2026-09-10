import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WaterManagementService } from '@/lib/services/water-management-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const program = await WaterManagementService.getConservationProgram(id);
  if (!program) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ program });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const program = await WaterManagementService.updateConservationProgram(id, body);
    if (!program) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ program });
  } catch (e) {
    console.error('[water-management/conservation] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_program' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await WaterManagementService.deleteConservationProgram(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
