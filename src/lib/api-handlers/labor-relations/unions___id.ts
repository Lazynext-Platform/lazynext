import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { LaborRelationsService } from '@/lib/services/labor-relations-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const union = await LaborRelationsService.getUnion(id);
  if (!union) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ union });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const union = await LaborRelationsService.updateUnion(id, body);
    if (!union) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ union });
  } catch (e) {
    console.error('[labor-relations/unions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_union' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await LaborRelationsService.deleteUnion(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
