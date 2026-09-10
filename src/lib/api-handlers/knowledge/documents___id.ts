import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/knowledge/documents/[id] — get a single document.
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

    return NextResponse.json({ document: doc });
  } catch (e) {
    console.error('[knowledge/documents] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_document' }, { status: 500 });
  }
}

/**
 * PATCH /api/knowledge/documents/[id] — update a document.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: {
    title?: string;
    content?: string;
    excerpt?: string;
    tags?: string[];
    status?: string;
    workspaceId?: string;
    changeSummary?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const existing = await KnowledgeService.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasOrg = workspaces.some((w) => w.organizationId === existing.organizationId);
    if (!hasOrg) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const updated = await KnowledgeService.update(id, {
      title: body.title?.trim(),
      content: body.content,
      excerpt: body.excerpt?.trim(),
      tags: body.tags,
      status: body.status as 'draft' | 'published' | 'archived' | undefined,
      workspaceId: body.workspaceId,
      editorId: session.user.id,
      changeSummary: body.changeSummary,
    });

    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ document: updated });
  } catch (e) {
    console.error('[knowledge/documents] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_document' }, { status: 500 });
  }
}

/**
 * DELETE /api/knowledge/documents/[id] — delete a document.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    const existing = await KnowledgeService.get(id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasOrg = workspaces.some((w) => w.organizationId === existing.organizationId);
    if (!hasOrg) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    await KnowledgeService.delete(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[knowledge/documents] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_document' }, { status: 500 });
  }
}
