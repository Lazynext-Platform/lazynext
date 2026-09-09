import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { JobArchitectureService } from '@/lib/services/job-architecture-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const path = await JobArchitectureService.getPath(id);
  if (!path) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ path });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const path = await JobArchitectureService.updatePath(id, body);
    if (!path) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ path });
  } catch (e) {
    console.error('[job-architecture/paths] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_path' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await JobArchitectureService.deletePath(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
