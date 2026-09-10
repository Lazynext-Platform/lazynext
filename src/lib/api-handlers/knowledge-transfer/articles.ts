import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { KnowledgeTransferService } from '@/lib/services/knowledge-transfer-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ articles: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['type', 'status', 'department']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const articles = await KnowledgeTransferService.listArticles(organizationId, opts as never);
  return NextResponse.json({ articles });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const type = String(body.type || '').trim();
  if (!title || !type) return NextResponse.json({ error: 'title_type_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const article = await KnowledgeTransferService.createArticle(ws.organizationId, ws.id, {
      title, type: type as never,
      description: body.description, content: body.content, tags: body.tags,
      status: body.status, author: body.author, department: body.department,
      version: body.version, publishedDate: body.publishedDate,
      reviewedBy: body.reviewedBy, reviewedDate: body.reviewedDate, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ article }, { status: 201 });
  } catch (e) {
    console.error('[knowledge-transfer/articles] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_article' }, { status: 500 });
  }
}
