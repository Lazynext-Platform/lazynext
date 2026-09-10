import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BackupService } from '@/lib/services/backup-service';

/** GET /api/data/backup — list backups for the user's workspace */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ backups: [] });
  }

  const workspaceId = workspaces[0].id;
  const backups = await BackupService.listBackups(workspaceId);
  return NextResponse.json({ backups });
}

/** POST /api/data/backup — create a new backup */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const type = String(body.type || 'full');

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];

  try {
    const backup = await BackupService.createBackup({
      workspaceId: ws.id,
      organizationId: ws.organizationId,
      type: type as 'full' | 'incremental',
      entities: Array.isArray(body.entities) ? body.entities : [],
      baseBackupId: body.baseBackupId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ backup }, { status: 201 });
  } catch (e) {
    console.error('[data/backup] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_backup' }, { status: 500 });
  }
}
