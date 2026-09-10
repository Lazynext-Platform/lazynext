import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ContextEngineService } from '@/lib/services/context-engine-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const snapshot = await ContextEngineService.getContextSnapshot(id);
  if (!snapshot) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ snapshot });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const snapshot = await ContextEngineService.updateContextSnapshot(id, body);
    if (!snapshot) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ snapshot });
  } catch (e) {
    console.error('[context-engine/snapshots] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_snapshot' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await ContextEngineService.deleteContextSnapshot(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
