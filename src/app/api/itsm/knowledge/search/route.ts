import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KnowledgeBaseService } from '@/lib/services/knowledge-base-service';

/** GET /api/itsm/knowledge/search?q=... — search published knowledge articles */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ articles: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  if (!q) {
    return NextResponse.json({ articles: [] });
  }

  const articles = await KnowledgeBaseService.searchArticles(organizationId, q);
  return NextResponse.json({ articles });
}
