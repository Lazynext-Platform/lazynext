import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge-service';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * GET /api/knowledge/documents — list knowledge documents with filters.
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const organizationId = sp.get('organizationId') || undefined;
  const workspaceId = sp.get('workspaceId') || undefined;
  const status = sp.get('status') || undefined;
  const search = sp.get('search') || undefined;
  const parentId = sp.get('parentId');
  const tagsParam = sp.get('tags');
  const limitParam = sp.get('limit');

  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasOrg = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasOrg) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const documents = await KnowledgeService.list(organizationId, {
      workspaceId: workspaceId || undefined,
      status: status as 'draft' | 'published' | 'archived' | undefined,
      tags,
      parentId: parentId === 'null' ? null : parentId || undefined,
      search: search || undefined,
      limit,
    });

    return NextResponse.json({ documents });
  } catch (e) {
    console.error('[knowledge/documents] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_documents' }, { status: 500 });
  }
}

/**
 * POST /api/knowledge/documents — create a knowledge document.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    title?: string;
    content?: string;
    workspaceId?: string;
    parentId?: string;
    tags?: string[];
    slug?: string;
    status?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const organizationId = body.organizationId?.trim();
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId_required' }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const hasOrg = workspaces.some((w) => w.organizationId === organizationId);
    if (!hasOrg) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const doc = await KnowledgeService.create(organizationId, {
      title,
      content: body.content,
      workspaceId: body.workspaceId,
      parentId: body.parentId,
      tags: body.tags,
      slug: body.slug,
      status: body.status as 'draft' | 'published' | 'archived' | undefined,
      authorId: session.user.id,
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (e) {
    console.error('[knowledge/documents] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_document' }, { status: 500 });
  }
}
