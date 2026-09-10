import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { LegalMatterService } from '@/lib/services/legal-matter-service';

/** GET /api/legal/matters/stats — matter stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      stats: {
        totalMatters: 0,
        byType: {},
        byStatus: {},
        byPriority: {},
        openCount: 0,
        totalEstimatedCost: 0,
        totalActualCost: 0,
      },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await LegalMatterService.getStats(organizationId);
  return NextResponse.json({ stats });
}
