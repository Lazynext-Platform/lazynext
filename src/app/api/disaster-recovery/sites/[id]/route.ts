import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DisasterRecoveryService } from '@/lib/services/disaster-recovery-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const site = await DisasterRecoveryService.getRecoverySite(id);
  if (!site) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ site });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const site = await DisasterRecoveryService.updateRecoverySite(id, body);
    if (!site) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ site });
  } catch (e) {
    console.error('[disaster-recovery/sites] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_site' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await DisasterRecoveryService.deleteRecoverySite(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
