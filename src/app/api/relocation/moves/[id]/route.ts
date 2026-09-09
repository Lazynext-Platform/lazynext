import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RelocationService } from '@/lib/services/relocation-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const move = await RelocationService.getMove(id);
  if (!move) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ move });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const move = await RelocationService.updateMove(id, body);
    if (!move) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ move });
  } catch (e) {
    console.error('[relocation/moves] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_move' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await RelocationService.deleteMove(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
