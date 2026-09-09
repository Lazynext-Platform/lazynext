import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ContextEngineService } from '@/lib/services/context-engine-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const assembly = await ContextEngineService.getContextAssembly(id);
  if (!assembly) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ assembly });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const assembly = await ContextEngineService.updateContextAssembly(id, body);
    if (!assembly) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ assembly });
  } catch (e) {
    console.error('[context-engine/assemblies] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_assembly' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await ContextEngineService.deleteContextAssembly(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
