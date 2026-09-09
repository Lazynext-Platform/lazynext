import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RndService } from '@/lib/services/rnd-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const patent = await RndService.getPatent(id);
  if (!patent) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ patent });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const patent = await RndService.updatePatent(id, body);
    if (!patent) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ patent });
  } catch (e) {
    console.error('[rnd/patents] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_patent' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await RndService.deletePatent(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
