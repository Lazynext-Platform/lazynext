import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataExportService } from '@/lib/services/data-export-service';

/** GET /api/data/export/stats — export stats for the user's workspace */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      total: 0, completed: 0, pending: 0, failed: 0, totalSizeBytes: 0, byFormat: {},
    });
  }

  const workspaceId = workspaces[0].id;
  const stats = await DataExportService.getExportStats(workspaceId);
  return NextResponse.json(stats);
}
