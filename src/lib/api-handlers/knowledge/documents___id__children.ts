import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/knowledge/documents/[id]/children — get child documents.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const doc = await KnowledgeService.get(id);
    if (!doc) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasOrg = workspaces.some((w) => w.organizationId === doc.organizationId);
    if (!hasOrg) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const children = await KnowledgeService.getChildren(id);
    return NextResponse.json({ children });
  } catch (e) {
    console.error('[knowledge/documents/children] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_children' }, { status: 500 });
  }
}
