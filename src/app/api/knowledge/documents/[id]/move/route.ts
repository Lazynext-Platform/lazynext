import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * POST /api/knowledge/documents/[id]/move — move a document to a new parent.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    newParentId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

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

    const moved = await KnowledgeService.moveDocument(id, body.newParentId ?? null);
    return NextResponse.json({ document: moved });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_move_document';
    if (msg.includes('Cannot make') || msg.includes('Cannot move')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error('[knowledge/documents/move] error:', e);
    return NextResponse.json({ error: 'failed_to_move_document' }, { status: 500 });
  }
}
