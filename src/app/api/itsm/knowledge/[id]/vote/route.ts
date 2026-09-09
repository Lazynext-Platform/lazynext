import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { KnowledgeBaseService } from '@/lib/services/knowledge-base-service';

/** POST /api/itsm/knowledge/[id]/vote — vote on a knowledge article (helpful=true|false) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const helpful = body.helpful !== false;

  try {
    const article = await KnowledgeBaseService.voteArticle(id, helpful);
    return NextResponse.json({ article });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed_to_vote';
    if (msg === 'article_not_found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    console.error('[itsm/knowledge/vote] error:', e);
    return NextResponse.json({ error: 'failed_to_vote' }, { status: 500 });
  }
}
