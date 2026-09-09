import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/knowledge/documents/[id]/links — get all links (outgoing + incoming).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

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

    const links = await KnowledgeService.getLinks(id);
    return NextResponse.json(links);
  } catch (e) {
    console.error('[knowledge/documents/links] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_links' }, { status: 500 });
  }
}

/**
 * POST /api/knowledge/documents/[id]/links — add a link from this document to another.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    targetId?: string;
    label?: string;
    linkType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const targetId = body.targetId?.trim();
  if (!targetId) {
    return NextResponse.json({ error: 'targetId_required' }, { status: 400 });
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

    const link = await KnowledgeService.addLink(doc.organizationId, {
      sourceId: id,
      targetId,
      label: body.label,
      linkType: body.linkType as 'reference' | 'related' | 'prerequisite' | 'extension' | undefined,
      createdBy: session.user.id,
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (e) {
    console.error('[knowledge/documents/links] add error:', e);
    return NextResponse.json({ error: 'failed_to_add_link' }, { status: 500 });
  }
}
