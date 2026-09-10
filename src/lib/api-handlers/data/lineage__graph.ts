import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataLineageService } from '@/lib/services/data-lineage-service';

/** GET /api/data/lineage/graph — get lineage graph for an entity */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ nodes: [], edges: [], depth: 0 });
  }

  const { searchParams } = new URL(req.url);
  const entity = searchParams.get('entity');
  const entityId = searchParams.get('entityId');
  const depth = parseInt(searchParams.get('depth') || '5', 10);

  if (!entity || !entityId) {
    return NextResponse.json({ error: 'entity_and_entityId_required' }, { status: 400 });
  }

  const graph = await DataLineageService.getLineageGraph(workspaces[0].id, entity, entityId, depth);
  return NextResponse.json(graph);
}
