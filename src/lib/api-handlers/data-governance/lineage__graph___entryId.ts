import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** GET /api/data-governance/lineage/graph/[entryId] — get lineage graph for a catalog entry */
export async function GET(
  _req: NextRequest,
  { params }: { params: { entryId: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ graph: { entryId: '', upstream: [], downstream: [] } });
  }

  const organizationId = workspaces[0].organizationId;
  const { entryId } = params;

  const graph = await DataGovernanceService.getLineageGraph(organizationId, entryId);
  return NextResponse.json({ graph });
}
