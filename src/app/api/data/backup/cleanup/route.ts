import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BackupService } from '@/lib/services/backup-service';

/** POST /api/data/backup/cleanup — clean up old backups per retention policy */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  try {
    const result = await BackupService.cleanupOldBackups(workspaces[0].id);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[data/backup/cleanup] error:', e);
    return NextResponse.json({ error: 'failed_to_cleanup' }, { status: 500 });
  }
}
