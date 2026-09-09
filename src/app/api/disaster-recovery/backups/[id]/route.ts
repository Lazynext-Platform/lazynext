import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DisasterRecoveryService } from '@/lib/services/disaster-recovery-service';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const backup = await DisasterRecoveryService.getBackupStrategy(id);
  if (!backup) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ backup });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const backup = await DisasterRecoveryService.updateBackupStrategy(id, body);
    if (!backup) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ backup });
  } catch (e) {
    console.error('[disaster-recovery/backups] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_backup' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const ok = await DisasterRecoveryService.deleteBackupStrategy(id);
  if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
