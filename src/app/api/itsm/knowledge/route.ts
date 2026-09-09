import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KnowledgeBaseService } from '@/lib/services/knowledge-base-service';

/** GET /api/itsm/knowledge — list knowledge articles */
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
  const filters: { status?: string; category?: string; type?: string; search?: string } = {};
  const status = url.searchParams.get('status');
  const category = url.searchParams.get('category');
  const type = url.searchParams.get('type');
  const search = url.searchParams.get('search');
  if (status) filters.status = status;
  if (category) filters.category = category;
  if (type) filters.type = type;
  if (search) filters.search = search;

  const articles = await KnowledgeBaseService.list(organizationId, filters);
  return NextResponse.json({ articles });
}

/** POST /api/itsm/knowledge — create a knowledge article */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const article = await KnowledgeBaseService.create({
      organizationId,
      workspaceId: body.workspaceId || undefined,
      title,
      content: body.content,
      category: body.category,
      type: body.type,
      status: body.status,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      authorId: body.authorId || session.user.id,
    });
    return NextResponse.json({ article }, { status: 201 });
  } catch (e) {
    console.error('[itsm/knowledge] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_article' }, { status: 500 });
  }
}
