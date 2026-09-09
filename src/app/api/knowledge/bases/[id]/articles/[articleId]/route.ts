import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeService } from '@/lib/services/knowledge';

/**
 * GET /api/knowledge/bases/[id]/articles/[articleId] — get an article by ID.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; articleId: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { articleId } = await params;

  try {
    const article = await KnowledgeService.getArticle(articleId);
    if (!article) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ article });
  } catch (e) {
    console.error('[knowledge/articles] get error:', e);
    return NextResponse.json({ error: 'failed_to_get_article' }, { status: 500 });
  }
}

/**
 * PATCH /api/knowledge/bases/[id]/articles/[articleId] — update an article.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; articleId: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { articleId } = await params;

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

  try {
    const existing = await KnowledgeService.getArticle(articleId);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const updated = await KnowledgeService.updateArticle(articleId, {
      title: body.title?.trim(),
      content: body.content,
      summary: body.summary?.trim(),
      source: body.source,
      sourceUrl: body.sourceUrl?.trim(),
      tags: body.tags,
      status: body.status,
    });
    return NextResponse.json({ article: updated });
  } catch (e) {
    console.error('[knowledge/articles] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_article' }, { status: 500 });
  }
}

/**
 * DELETE /api/knowledge/bases/[id]/articles/[articleId] — delete an article.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; articleId: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { articleId } = await params;

  try {
    const existing = await KnowledgeService.getArticle(articleId);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    await KnowledgeService.deleteArticle(articleId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[knowledge/articles] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_article' }, { status: 500 });
  }
}
