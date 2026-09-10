import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ManagementSuccessionService } from '@/lib/services/management-succession-service';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const candidate = await ManagementSuccessionService.getCandidate(id);
  if (!candidate) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ candidate });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const candidate = await ManagementSuccessionService.updateCandidate(id, body);
    if (!candidate) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ candidate });
  } catch (e) {
    console.error('[management-succession/candidates] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_candidate' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const ok = await ManagementSuccessionService.deleteCandidate(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
