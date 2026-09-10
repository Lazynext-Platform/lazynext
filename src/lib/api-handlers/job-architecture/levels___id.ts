import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { JobArchitectureService } from '@/lib/services/job-architecture-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const level = await JobArchitectureService.getLevel(id);
  if (!level) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ level });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const level = await JobArchitectureService.updateLevel(id, body);
    if (!level) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ level });
  } catch (e) {
    console.error('[job-architecture/levels] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_level' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await JobArchitectureService.deleteLevel(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
