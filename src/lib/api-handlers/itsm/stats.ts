import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ITSMService } from '@/lib/services/itsm-service';
import { ChangeManagementService } from '@/lib/services/change-management-service';
import { KnowledgeBaseService } from '@/lib/services/knowledge-base-service';

/** GET /api/itsm/stats — overall ITSM stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({
      stats: {
        incidents: { total: 0, byStatus: {}, byPriority: {}, slaBreaches: 0 },
        changes: { total: 0, byStatus: {}, byType: {} },
        knowledge: { total: 0, byStatus: {}, byCategory: {}, totalViews: 0 },
      },
    });
  }

  const organizationId = workspaces[0].organizationId;
  const [incidents, changes, knowledge] = await Promise.all([
    ITSMService.getStats(organizationId),
    ChangeManagementService.getStats(organizationId),
    KnowledgeBaseService.getStats(organizationId),
  ]);
  return NextResponse.json({ stats: { incidents, changes, knowledge } });
}
