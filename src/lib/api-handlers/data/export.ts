import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataExportService } from '@/lib/services/data-export-service';

/** GET /api/data/export — list exports for the user's workspace */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ exports: [] });
  }

  const workspaceId = workspaces[0].id;
  const exports = await DataExportService.listExports(workspaceId);
  return NextResponse.json({ exports });
}

/** POST /api/data/export — create a new export */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const format = String(body.format || 'json');
  const entities = Array.isArray(body.entities) ? body.entities : [];

  if (entities.length === 0) {
    return NextResponse.json({ error: 'entities_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];

  try {
    const exportRecord = await DataExportService.createExport({
      workspaceId: ws.id,
      organizationId: ws.organizationId,
      format: format as 'json' | 'csv' | 'sql',
      entities,
      filters: body.filters,
      createdBy: session.user.id,
    });
    return NextResponse.json({ export: exportRecord }, { status: 201 });
  } catch (e) {
    console.error('[data/export] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_export' }, { status: 500 });
  }
}
