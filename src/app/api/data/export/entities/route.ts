import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataExportService } from '@/lib/services/data-export-service';

/** GET /api/data/export/entities — list exportable entities with counts */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ entities: [] });
  }

  const workspaceId = workspaces[0].id;
  const entities = await DataExportService.getExportableEntities(workspaceId);
  return NextResponse.json({ entities });
}
