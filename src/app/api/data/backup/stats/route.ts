import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BackupService } from '@/lib/services/backup-service';

/** GET /api/data/backup/stats — backup stats for the user's workspace */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      total: 0, completed: 0, pending: 0, failed: 0, totalSizeBytes: 0, scheduled: false, lastBackupAt: null,
    });
  }

  const stats = await BackupService.getBackupStats(workspaces[0].id);
  return NextResponse.json(stats);
}
