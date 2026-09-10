import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataLineageService } from '@/lib/services/data-lineage-service';

/** GET /api/data/lineage — list lineage records for the user's workspace */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ records: [] });
  }

  const { searchParams } = new URL(req.url);
  const entity = searchParams.get('entity');
  const entityId = searchParams.get('entityId');

  if (entity && entityId) {
    const records = await DataLineageService.getEntityLineage(workspaces[0].id, entity, entityId);
    return NextResponse.json({ records });
  }

  // Return all lineage records for the workspace
  const stats = await DataLineageService.getStats(workspaces[0].id);
  return NextResponse.json({ stats });
}

/** POST /api/data/lineage — record a new lineage entry */
export async function POST(req: NextRequest) {
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
    const record = await DataLineageService.recordLineage({
      workspaceId: ws.id,
      organizationId: ws.organizationId,
      sourceEntity: String(body.sourceEntity || ''),
      sourceId: String(body.sourceId || ''),
      targetEntity: String(body.targetEntity || ''),
      targetId: String(body.targetId || ''),
      transformation: String(body.transformation || 'copy'),
      metadata: body.metadata,
      createdBy: session.user.id,
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (e) {
    console.error('[data/lineage] create error:', e);
    return NextResponse.json({ error: 'failed_to_record_lineage' }, { status: 500 });
  }
}
