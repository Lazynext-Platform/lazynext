import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { JobArchitectureService } from '@/lib/services/job-architecture-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const family = await JobArchitectureService.getFamily(id);
  if (!family) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ family });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const family = await JobArchitectureService.updateFamily(id, body);
    if (!family) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ family });
  } catch (e) {
    console.error('[job-architecture/families] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_family' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await JobArchitectureService.deleteFamily(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
