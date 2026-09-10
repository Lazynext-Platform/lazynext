import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BackupService } from '@/lib/services/backup-service';

/** GET /api/data/backup/schedule — get the backup schedule */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ schedule: null });
  }

  const schedule = await BackupService.getSchedule(workspaces[0].id);
  return NextResponse.json({ schedule });
}

/** POST /api/data/backup/schedule — create a backup schedule */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const frequency = String(body.frequency || 'daily');

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];

  try {
    const schedule = await BackupService.scheduleBackup({
      workspaceId: ws.id,
      organizationId: ws.organizationId,
      frequency: frequency as 'daily' | 'weekly' | 'monthly',
      type: String(body.type || 'full') as 'full' | 'incremental',
      entities: Array.isArray(body.entities) ? body.entities : [],
      createdBy: session.user.id,
    });
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (e) {
    console.error('[data/backup/schedule] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_schedule' }, { status: 500 });
  }
}

/** DELETE /api/data/backup/schedule — cancel the backup schedule */
export async function DELETE(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  try {
    await BackupService.cancelSchedule(workspaces[0].id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[data/backup/schedule] cancel error:', e);
    return NextResponse.json({ error: 'failed_to_cancel_schedule' }, { status: 500 });
  }
}
