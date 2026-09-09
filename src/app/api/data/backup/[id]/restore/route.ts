import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { BackupService } from '@/lib/services/backup-service';

/** POST /api/data/backup/[id]/restore — restore (dry-run) a backup */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const plan = await BackupService.restore(id);
    if (!plan) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (e) {
    console.error('[data/backup] restore error:', e);
    return NextResponse.json({ error: 'failed_to_restore' }, { status: 500 });
  }
}
