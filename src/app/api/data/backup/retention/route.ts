import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BackupService } from '@/lib/services/backup-service';

/** GET /api/data/backup/retention — get retention policy */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ maxBackups: 50, retentionDays: 30, minKeep: 3 });
  }

  const policy = await BackupService.getRetentionPolicy(workspaces[0].id);
  return NextResponse.json(policy);
}

/** PATCH /api/data/backup/retention — update retention policy */
export async function PATCH(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];

  try {
    const policy = await BackupService.setRetentionPolicy(
      ws.id,
      ws.organizationId,
      {
        maxBackups: body.maxBackups,
        retentionDays: body.retentionDays,
        minKeep: body.minKeep,
      },
      session.user.id,
    );
    return NextResponse.json(policy);
  } catch (e) {
    console.error('[data/backup/retention] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_retention' }, { status: 500 });
  }
}
