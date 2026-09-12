import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ResearchService } from '@/lib/services/research';

/**
 * GET /api/research/sessions/[id]/citations — list citations for a session.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const citations = await ResearchService.listCitations(id);
    return NextResponse.json({ citations });
  } catch (e) {
    console.error('[research/citations] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_citations' }, { status: 500 });
  }
}

/**
 * POST /api/research/sessions/[id]/citations — add a citation to a session.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    url?: string;
    title?: string;
    snippet?: string;
    publishedAt?: string;
    credibility?: 'low' | 'medium' | 'high';
    metadata?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: 'url_required' }, { status: 400 });
  }

  try {
    const citation = await ResearchService.addCitation(id, {
      url,
      title: body.title?.trim() || undefined,
      snippet: body.snippet?.trim() || undefined,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
      credibility: body.credibility,
      metadata: body.metadata,
    });
    return NextResponse.json({ citation }, { status: 201 });
  } catch (e) {
    console.error('[research/citations] create error:', e);
    return NextResponse.json({ error: 'failed_to_add_citation' }, { status: 500 });
  }
}

/**
 * DELETE /api/research/sessions/[id]/citations?citationId=xxx — delete a citation.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const citationId = new URL(req.url).searchParams.get('citationId');
  if (!citationId) {
    return NextResponse.json({ error: 'citationId_required' }, { status: 400 });
  }

  try {
    const result = await ResearchService.deleteCitation(id, citationId);
    if (result.count === 0) {
      return NextResponse.json({ error: 'citation_not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (e) {
    console.error('[research/citations] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_citation' }, { status: 500 });
  }
}
