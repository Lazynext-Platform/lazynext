import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge';

/**
 * GET /api/knowledge/bases/[id]/articles — list articles in a knowledge base.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const articles = await KnowledgeService.listArticles(id);
    return NextResponse.json({ articles });
  } catch (e) {
    console.error('[knowledge/articles] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_articles' }, { status: 500 });
  }
}

/**
 * POST /api/knowledge/bases/[id]/articles — create an article.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    title?: string;
    content?: string;
    summary?: string;
    source?: 'manual' | 'research' | 'agent' | 'import';
    sourceUrl?: string;
    tags?: string[];
    status?: 'draft' | 'published' | 'archived';
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: 'content_required' }, { status: 400 });
  }

  try {
    const article = await KnowledgeService.createArticle(id, {
      title,
      content,
      summary: body.summary?.trim() || undefined,
      source: body.source,
      sourceUrl: body.sourceUrl?.trim() || undefined,
      tags: body.tags,
      status: body.status,
      createdBy: session.user.id,
    });
    return NextResponse.json({ article }, { status: 201 });
  } catch (e) {
    console.error('[knowledge/articles] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_article' }, { status: 500 });
  }
}
