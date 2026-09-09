import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { MigrationService } from '@/lib/services/migration-service';

/** GET /api/data/migration — list migrations for the user's workspace */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ migrations: [] });
  }

  const migrations = await MigrationService.listMigrations(workspaces[0].id);
  return NextResponse.json({ migrations });
}

/** POST /api/data/migration — create a new migration plan */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];

  try {
    const migration = await MigrationService.createMigration({
      workspaceId: ws.id,
      organizationId: ws.organizationId,
      name,
      sourceType: String(body.sourceType || ''),
      targetType: String(body.targetType || ''),
      mappings: Array.isArray(body.mappings) ? body.mappings : [],
      options: body.options,
      createdBy: session.user.id,
    });
    return NextResponse.json({ migration }, { status: 201 });
  } catch (e) {
    console.error('[data/migration] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_migration' }, { status: 500 });
  }
}
