import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/knowledge/tags — get all unique tags with counts.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || undefined;

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasOrg = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasOrg) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const tags = await KnowledgeService.getTags(organizationId);
    return NextResponse.json({ tags });
  } catch (e) {
    console.error('[knowledge/tags] error:', e);
    return NextResponse.json({ error: 'failed_to_get_tags' }, { status: 500 });
  }
}
