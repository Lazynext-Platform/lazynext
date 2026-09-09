import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BackupService } from '@/lib/services/backup-service';

/** GET /api/data/backup/[id] — get a single backup */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const backup = await BackupService.getBackup(id);
  if (!backup) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ backup });
}

/** DELETE /api/data/backup/[id] — delete a backup */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await BackupService.deleteBackup(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[data/backup] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_backup' }, { status: 500 });
  }
}
