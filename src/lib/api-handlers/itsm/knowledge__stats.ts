import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KnowledgeBaseService } from '@/lib/services/knowledge-base-service';

/** GET /api/itsm/knowledge/stats — knowledge base stats */
export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ stats: { total: 0, byStatus: {}, byCategory: {}, totalViews: 0 } });
  }

  const organizationId = workspaces[0].organizationId;
  const stats = await KnowledgeBaseService.getStats(organizationId);
  return NextResponse.json({ stats });
}
