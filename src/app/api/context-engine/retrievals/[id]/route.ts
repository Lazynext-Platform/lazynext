import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ContextEngineService } from '@/lib/services/context-engine-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const retrieval = await ContextEngineService.getContextRetrieval(id);
  if (!retrieval) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ retrieval });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const retrieval = await ContextEngineService.updateContextRetrieval(id, body);
    if (!retrieval) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ retrieval });
  } catch (e) {
    console.error('[context-engine/retrievals] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_retrieval' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await ContextEngineService.deleteContextRetrieval(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
