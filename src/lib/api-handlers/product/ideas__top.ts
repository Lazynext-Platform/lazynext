import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { FeatureIdeaService } from '@/lib/services/product-management-service';

/** GET /api/product/ideas/top — get top feature ideas by votes */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ ideas: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);

  const ideas = await FeatureIdeaService.getTopIdeas(organizationId, limit);
  return NextResponse.json({ ideas });
}
