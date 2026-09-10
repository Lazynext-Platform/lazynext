import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { JobArchitectureService } from '@/lib/services/job-architecture-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const role = await JobArchitectureService.getRole(id);
  if (!role) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ role });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const role = await JobArchitectureService.updateRole(id, body);
    if (!role) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ role });
  } catch (e) {
    console.error('[job-architecture/roles] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_role' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await JobArchitectureService.deleteRole(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
