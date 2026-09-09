import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataLineageService } from '@/lib/services/data-lineage-service';

/** GET /api/data/lineage/stats — lineage stats for the user's workspace */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      totalRecords: 0, bySourceEntity: {}, byTargetEntity: {}, byTransformation: {},
    });
  }

  const stats = await DataLineageService.getStats(workspaces[0].id);
  return NextResponse.json(stats);
}
